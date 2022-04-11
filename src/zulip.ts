import { isURL } from 'validator';
import zulip from 'zulip-js';
import {
  maxDelaySeconds,
  publicIP,
  publicPort,
  publicScheme,
  version,
  zulipStream,
  zulipTopic,
} from './config';
import PgnHistory from './PgnHistory';
import { pollURL } from './poll';
import { Redis } from './redis';
import {
  envOrDie,
  markdownPre,
  markdownTable,
  notEmpty,
  Replacement,
  sleep,
  Source,
} from './utils';

interface Handler {
  (params: { args: string[]; text: string; msgId: number }): Promise<unknown>;
}

export class Zulip {
  constructor(private z: any, private redis: Redis) {}

  static async new(redis: Redis): Promise<Zulip> {
    return new Zulip(
      await zulip({
        username: envOrDie('ZULIP_USERNAME'),
        apiKey: envOrDie('ZULIP_API_KEY'),
        realm: envOrDie('ZULIP_REALM'),
      }),
      redis
    );
  }

  react = async (name: string, messageId: number) =>
    await this.z.reactions.add({
      message_id: messageId,
      emoji_name: name,
    });

  say = async (text: string) =>
    await this.z.messages.send({
      to: zulipStream,
      type: 'stream',
      subject: zulipTopic,
      content: text,
    });

  private lastSay = '';
  sayOnce = async (text: string) => {
    if (text != this.lastSay) await this.say(text);
    this.lastSay = text;
  };

  msgHandler = async (msg: any) => {
    try {
      let text = msg.content.trim();
      if (text.startsWith('Reminder: ')) {
        text = text.slice(10);
      }
      console.log(`Received command: ${text}`);
      const parts = text.split(/\s+/);
      if (parts.length < 1) return;
      const command = parts[0].toLowerCase();
      parts.shift(); // Remove initial command
      for (const [cmds, handler] of this.commands) {
        if (cmds.some((c) => c === command)) {
          console.log(`Processing ${command} command`);
          await handler({
            args: parts,
            text: text.substr(command.length + 1),
            msgId: msg.id,
          });
          return;
        }
      }
      console.log('Unprocessed command');
    } catch (e) {
      console.error(`Uncaught error: ${e}`);
    }
  };

  messageLoop = async () => {
    await this.z.users.me.subscriptions.add({
      subscriptions: JSON.stringify([{ name: zulipStream }]),
    });

    const q = await this.z.queues.register({ event_types: ['message'] });

    let lastEventId = -1;
    while (true) {
      try {
        const res = await this.z.events.retrieve({
          queue_id: q.queue_id,
          last_event_id: lastEventId,
        });
        res.events.forEach(async (event: any) => {
          lastEventId = event.id;
          if (event.type == 'heartbeat') {
            // console.log('Zulip heartbeat');
          } else if (event.message) {
            if (event.message.subject == zulipTopic)
              await this.msgHandler(event.message);
          } else console.log(event);
        });
      } catch (e) {
        console.error(e);
        await sleep(2000);
      }
    }
  };

  addOrSet = async ({ args }: { args: string[] }) => {
    if (args.length < 2 && 4 < args.length) return;

    const updateFreqSeconds = args.length > 2 ? parseInt(args[2]) : 10;
    const delaySeconds = args.length > 3 ? parseInt(args[3]) : 0;
    if (delaySeconds > maxDelaySeconds) {
      this.say(`Delay must be <= ${maxDelaySeconds}`);
      return;
    }
    let name = args[0];
    let url = args[1];
    if (url.startsWith('<')) url = url.slice(1);
    if (url.endsWith('>')) url = url.slice(0, url.length - 1);

    if (!isURL(url)) {
      this.say(`${url} is not a valid URL`);
      console.log(`${url} is not a valid url`);
      return;
    }
    const previous = await this.redis.getSource(name);
    const source = {
      name,
      url,
      updateFreqSeconds,
      pgnHistory:
        previous?.url == url
          ? previous.pgnHistory
          : new PgnHistory([], delaySeconds),
      delaySeconds,
      dateLastPolled: new Date(),
      dateLastUpdated: new Date(),
    };
    await this.redis.setSource(source);
    pollURL(name, this.redis, this);
    await sleep(0.5);
    await this.say(formatSource(source));
    return source;
  };

  addMany = async ({ args, msgId }: { args: string[]; msgId: number }) => {
    if (args.length < 4 && 6 < args.length) return;

    const vars = args.shift();
    if (vars === undefined) return;
    const sources = await Promise.all(
      vars.split(',').map(async (x) => {
        const newArgs = args.map((p) => p.replace(/\{\}/, x));
        return await this.addOrSet({ args: newArgs });
      })
    );
    await this.react('check_mark', msgId);
    await this.say(formatManySources(sources.filter(notEmpty)));
  };

  remove = async ({ args, msgId }: { args: string[]; msgId: number }) => {
    if (args.length !== 1) return;
    await this.redis.removeSource(args[0]);
    await this.react('check_mark', msgId);
  };

  list = async () => {
    const sources = await this.redis.getSources();
    if (!sources.length) await this.say('No active sources');
    else
      await this.say(
        markdownTable([
          ['Name', 'Destination', 'Freq', 'Delay', 'Source'],
          ...sources.map((s) => [
            s.name,
            `${publicScheme}://${publicIP}:${publicPort}/${s.name}`,
            `1/${s.updateFreqSeconds}s`,
            `${s.delaySeconds}s`,
            s.url,
          ]),
        ])
      );
  };

  clearAllSources = async ({ msgId }: { msgId: number }) => {
    console.log(`Clearing all sources`);
    const sources = await this.redis.getSources();
    sources.forEach(async (s) => {
      console.log(`Clearing source: ${s.name}`);
      await this.redis.removeSource(s.name);
    });
    await this.react('check_mark', msgId);
    await this.say(`Cleared ${sources.length} sources`);
  };

  addReplacement = async ({ text, msgId }: { text: string; msgId: number }) => {
    const regex = text.startsWith('r`');
    if (regex) text = text.substring(1);
    const [oldContent, newContent] = text.split('->').map((s) =>
      s
        .trim()
        .replace(/^`+|`+$/g, '')
        .replace(/\\n/g, '\n')
    );
    const replacement: Replacement = { oldContent, newContent };
    if (regex) replacement.regex = true;
    await this.redis.setReplacements([
      ...(await this.redis.getReplacements()),
      replacement,
    ]);
    await this.react('check_mark', msgId);
  };

  addReplacements = async ({
    text,
    msgId,
  }: {
    text: string;
    msgId: number;
  }) => {
    const replacements = text
      .replace(/^`+|`+$/g, '')
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => {
        const [oldContent, newContent] = x.split('\t').map((x) => x.trim());
        return { oldContent, newContent };
      });
    await this.redis.setReplacements([
      ...(await this.redis.getReplacements()),
      ...replacements,
    ]);
    await this.react('check_mark', msgId);
  };

  listReplacements = async () => {
    await this.say(
      markdownTable([
        ['ID', 'From', 'To', 'Regex'],
        ...(
          await this.redis.getReplacements()
        ).map((r, i) => [
          '' + i,
          markdownPre(r.oldContent.replace(/\n/g, '\\n')),
          markdownPre(r.newContent.replace(/\n/g, '\\n')),
          r.regex ? 'regex' : '',
        ]),
      ])
    );
  };

  removeReplacement = async ({
    args,
    msgId,
  }: {
    args: string[];
    msgId: number;
  }) => {
    if (args.length !== 1) return;

    const parts = args[0].split('-');
    const start = parseInt(parts[0]);
    const end = parseInt(parts[parts.length - 1]);
    await this.redis.setReplacements(
      (
        await this.redis.getReplacements()
      ).filter((_, i) => i < start || i > end)
    );
    await this.react('check_mark', msgId);
  };

  version = async () => {
    await this.say(`Version: ${version}`);
  };

  commands: [string[], Handler][] = [
    [['add', 'set'], this.addOrSet],
    [['addmany', 'add-many'], this.addMany],
    [['remove', 'rm', 'del', 'stop'], this.remove],
    [['list'], this.list],
    [['clear-all-sources'], this.clearAllSources],
    [['replace', 'addreplacement', 'add-replacement'], this.addReplacement],
    [
      ['replace-multiple', 'addreplacements', 'add-replacements'],
      this.addReplacements,
    ],
    [
      ['replacements', 'listreplacements', 'list-replacements'],
      this.listReplacements,
    ],
    [
      [
        'removereplacement',
        'remove-replacement',
        'delreplacement',
        'del-replacement',
        'rmreplacement',
        'rm-replacement',
      ],
      this.removeReplacement,
    ],
    [['version'], this.version],
  ];
}

const formatSource = (s: Source) =>
  [
    `\`${s.name}\``,
    `Source URL: ${s.url}`,
    `Exposed URL: ${publicScheme}://${publicIP}:${publicPort}/${s.name}`,
    `Update frequency: once every ${s.updateFreqSeconds} seconds`,
    `Delay: ${s.delaySeconds} seconds`,
  ].join('\n');

const formatManySources = (sources: Source[]) =>
  `all of them -> ${publicScheme}://${publicIP}:${publicPort}/${sources
    .map((s) => s.name)
    .join('/')}`;
