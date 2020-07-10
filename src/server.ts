import { RTMClient } from "@slack/rtm-api";
import { WebClient } from "@slack/web-api";
import { createHandyClient } from "handy-redis";
import request from "request";
import { isURL } from "validator";
import { config as configDotEnv } from "dotenv";
import {
  Source,
  notEmpty,
  envOr,
  envOrDie,
  Replacements,
  Replacement,
  isCommand,
  dbg,
} from "./utils";
import Koa from "koa";
import Router from "@koa/router";
import { promisify } from "util";
import { differenceInSeconds } from "date-fns";

let sleep = promisify(setTimeout);

configDotEnv();

//------------------------------------------------------------------------------
// Environment variables/config
const token = envOrDie("SLACK_BOT_TOKEN");
const cookie = envOrDie("PGN_MULE_COOKIE");
const publicScheme = envOrDie("PUBLIC_SCHEME");
const publicIP = envOrDie("PUBLIC_IP");
const publicPort = parseInt(envOrDie("PUBLIC_PORT"));
const defaultChannel = envOrDie("DEFAULT_CHANNEL");
const slowPollRate = parseFloat(envOrDie("SLOW_POLL_RATE_SECONDS"));
const minutesInactivitySlowDown = parseFloat(
  envOrDie("MINUTES_INACTIVITY_SLOWDOWN")
);
const minutesInactivityDie = parseFloat(envOrDie("MINUTES_INACTIVITY_DIE"));
const userAgent = envOr(
  "PGN_MULE_UA",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
);

//------------------------------------------------------------------------------
// Global connections, etc.
const rtm = new RTMClient(token);
const web = new WebClient(token);
const redisClient = createHandyClient();

//------------------------------------------------------------------------------
// Global functions
let pollURL = async (name: string) => {
  let source = await getSource(name);
  if (source === undefined) return;
  request(
    {
      uri: source.url,
      headers: {
        Cookie: cookie,
        "User-Agent": userAgent,
      },
    },
    async (err, res, body) => {
      let source = await getSource(name);
      if (source === undefined) return;
      if (body && !err && res.statusCode === 200) {
        source.pgn = body;
        let allGames = body.split("[Event").filter((g: string) => !!g);
        console.log(
          `[${name}]: Got ${allGames.length} games (${body.length} bytes)`
        );
      } else if (!body) {
        console.log(`[${name}]: Empty response`);
      } else if (res.statusCode !== 404) {
        console.log(`[${name}]: ERROR ${res.statusCode} err:${err}`);
      }
      const secondsSinceUpdated = differenceInSeconds(
        new Date(),
        source.dateLastUpdated
      );
      source.dateLastUpdated = new Date();
      await setSource(source);
      const minutes =
        differenceInSeconds(new Date(), source.dateLastPolled) / 60.0;
      if (minutes >= minutesInactivityDie) {
        console.log(`${name} removed due to inactivity`);
        say(`${name} removed due to inactivity`, defaultChannel);
        await removeSource(name);
      } else {
        let delay = source.delay * 1000;
        if (minutes >= minutesInactivitySlowDown) {
          delay = Math.max(source.delay * 4 * 1000, slowPollRate * 1000);
          console.log(`New Delay: ${delay}`);
          console.log(
            `Checking whether we just slowed down or not: ${secondsSinceUpdated} < ${slowPollRate} = ${
              secondsSinceUpdated < slowPollRate
            }`
          );
          console.log(
            `secondsSinceUpdate - source.delay = ${Math.abs(
              secondsSinceUpdated - source.delay / 1000.0
            )} | secondsSinceUpdate - slowPollRate = ${Math.abs(
              secondsSinceUpdated - slowPollRate
            )}
            Are we closer to the slow poll rate? ${
              Math.abs(secondsSinceUpdated - source.delay / 1000.0) <
              Math.abs(secondsSinceUpdated - slowPollRate)
            }
          `
          );
          if (
            Math.abs(secondsSinceUpdated - source.delay / 1000.0) <
            Math.abs(secondsSinceUpdated - slowPollRate)
          ) {
            say(
              `${name} Slowing refresh to ${delay / 1000} seconds`,
              defaultChannel
            );
          }
        }
        setTimeout(() => pollURL(name), delay);
      }
    }
  );
};

let react = async (name: string, channel: any, ts: any) => {
  const result = await web.reactions.add({
    name: name,
    channel: channel,
    timestamp: ts,
  });
  console.log(
    `Successfully added reaction ${result.ts} in conversation ${channel}`
  );
};

let say = async (message: string, channel: any) => {
  await web.chat.postMessage({
    text: message,
    channel: channel,
    as_user: true,
  });
};

let removeSource = async (name: string) => {
  await redisClient.del(`pgnmule:${name}`);
};
let remove = async (name: string, event: any) => {
  await removeSource(name);
  await react("heavy_check_mark", event.channel, event.ts);
};

let setSource = async (s: Source) => {
  await redisClient.set(`pgnmule:${s.name}`, JSON.stringify(s));
};

let sourceFromJSON = (s: string): Source => {
  let d = JSON.parse(s);
  return {
    url: d.url,
    name: d.name,
    delay: d.delay,
    pgn: d.pgn,
    dateLastPolled: new Date(d.dateLastPolled),
    dateLastUpdated: new Date(d.dateLastUpdated),
  };
};

let getSources = async () => {
  let keys = await redisClient.keys("pgnmule:*");
  console.log(`Got ${keys.length} sources: ${JSON.stringify(keys)}`);
  return (await Promise.all(keys.map((k) => redisClient.get(k))))
    .filter(notEmpty)
    .map(sourceFromJSON);
};
let clearAllSources = async (event: any) => {
  console.log(`Clearing all sources`);
  let sources = await getSources();
  sources.forEach(async (s) => {
    console.log(`Clearing source: ${s.name}`);
    await removeSource(s.name);
  });
  await react("heavy_check_mark", event.channel, event.ts);
  await say(`Cleared ${sources.length} sources`, event.channel);
};

let startSources = async () => {
  (await getSources()).forEach((s) => {
    console.log(`Starting ${s.name}`);
    pollURL(s.name);
  });
};

let getSource = async (name: string) => {
  let value = await redisClient.get(`pgnmule:${name}`);
  if (!value) return undefined;
  return sourceFromJSON(value);
};

let formatSource = (s: Source) =>
  `${s.name}: ${s.url} / ${s.delay}s -> ${publicScheme}://${publicIP}:${publicPort}/${s.name}`;

let formatManySources = (sources: Source[]) =>
  `all of them -> ${publicScheme}://${publicIP}:${publicPort}/${sources
    .map((s) => s.name)
    .join("/")}`;

let list = async (event: any) => {
  let message = (await getSources()).map(formatSource).join("\n");
  message = message || "No current urls";
  say(message, event.channel);
};

let addOrSet = async (
  parts: string[],
  event: any,
  shouldReact: boolean = true
) => {
  let delay = 10;
  if (parts.length > 3) {
    delay = parseInt(parts[3]);
  }
  let name = parts[1];
  let url = parts[2];
  if (url.startsWith("<")) {
    url = url.slice(1);
  }
  if (url.endsWith(">")) {
    url = url.slice(0, url.length - 1);
  }
  if (!isURL(url)) {
    say(`${url} is not a valid URL`, event.channel);
    console.log(`${url} is not a valid url`);
    return;
  }
  let source = {
    name,
    url,
    delay,
    pgn: "",
    dateLastPolled: new Date(),
    dateLastUpdated: new Date(),
  };
  await setSource(source);
  pollURL(name);
  if (shouldReact) {
    await react("heavy_check_mark", event.channel, event.ts);
  }
  await sleep(0.5);
  await say(formatSource(source), event.channel);
  return source;
};

let addMany = async (parts: string[], event: any) => {
  parts.shift(); // Remove initial command
  let vars = parts.shift(); // Remove vars
  if (vars === undefined) return;
  let sources = await Promise.all(
    vars.split(",").map(async (x) => {
      let newParts = parts.map((p) => p.replace(/\{\}/, x));
      return await addOrSet(["add", ...newParts], event, false);
    })
  );
  await react("heavy_check_mark", event.channel, event.ts);
  await say(formatManySources(sources.filter(notEmpty)), event.channel);
};

let setReplacements = async (replacements: Replacements) => {
  await redisClient.set(
    "pgnmuleprivate:replacements",
    JSON.stringify(replacements)
  );
};
let getReplacements = async () => {
  let replacementsString = await redisClient.get("pgnmuleprivate:replacements");
  if (!notEmpty(replacementsString)) {
    return [] as Replacements;
  }
  return JSON.parse(replacementsString) as Replacements;
};
let replace = async (pgn: string) => {
  let replacements = await getReplacements();
  return replacements.reduce((current, r) => {
    return current.replace(r.oldContent, r.newContent);
  }, pgn);
};
let addReplacement = async (event: any, replacementString: string) => {
  let replacement = JSON.parse(replacementString) as Replacement;
  await setReplacements([...(await getReplacements()), replacement]);
  await react("heavy_check_mark", event.channel, event.ts);
};
let listReplacements = async (event: any) => {
  await say(
    `Replacements: \n ${(await getReplacements())
      .map((r, i) => `*${i}* -> ${JSON.stringify(r)}`)
      .join("\n")}`,
    event.channel
  );
};
let removeReplacement = async (event: any, indexString: string) => {
  let index = parseInt(indexString);
  await setReplacements(
    (await getReplacements()).filter((_, i) => i !== index)
  );
  await react("heavy_check_mark", event.channel, event.ts);
};

//------------------------------------------------------------------------------
// The RTM handler
rtm.on("message", async (event) => {
  try {
    if (event.subtype !== undefined && event.subtype !== "message_edited") {
      return;
    }
    let text = event.text;
    if (text.startsWith("Reminder: ")) {
      text = text.slice(10);
    }
    let parts = text.split(/\s+/);
    if (parts.length < 1) {
      return;
    }
    let command = parts[0].toLowerCase();
    if (
      isCommand(command, ["add", "set"]) &&
      (parts.length === 3 || parts.length === 4)
    ) {
      console.log(`Processing add command ${parts}`);
      await addOrSet(parts, event);
    } else if (
      isCommand(command, ["addmany", "add-many"]) &&
      (parts.length === 4 || parts.length === 5)
    ) {
      console.log(`Processing addMany command ${parts}`);
      await addMany(parts, event);
    } else if (
      isCommand(command, ["remove", "rm", "del"]) &&
      parts.length == 2
    ) {
      console.log(`Processing remove command ${parts}`);
      await remove(parts[1], event);
    } else if (isCommand(command, ["list"]) && parts.length === 1) {
      console.log(`Processing list command ${parts}`);
      list(event);
    } else if (
      isCommand(command, ["clear-all-sources"]) &&
      parts.length === 1
    ) {
      console.log(`Processing clear-all-sources command ${parts}`);
      await clearAllSources(event);
    } else if (
      isCommand(command, ["addreplacement", "add-replacement"]) &&
      parts.length > 1
    ) {
      console.log(`Processing add-replacement command ${parts}`);
      await addReplacement(event, text.substr(command.length + 1));
    } else if (
      isCommand(command, ["listreplacements", "list-replacements"]) &&
      parts.length === 1
    ) {
      console.log(`Processing list-replacement command ${parts}`);
      listReplacements(event);
    } else if (
      isCommand(command, [
        "removereplacement",
        "remove-replacement",
        "delreplacement",
        "del-replacement",
        "rmreplacement",
        "rm-replacement",
      ]) &&
      parts.length === 2
    ) {
      console.log(`Processing remove-replacement command ${parts}`);
      removeReplacement(event, parts[1]);
    }
  } catch (e) {
    console.error(`Uncaught error: ${e}`);
  }
});

//------------------------------------------------------------------------------
// Log lifecycle events
rtm.on("connecting", () => {
  console.info("Connecting");
});
rtm.on("authenticated", (connectData) => {
  console.info(`Authenticating: ${JSON.stringify(connectData)}`);
});
rtm.on("connected", () => {
  console.info("Connected");
});
rtm.on("ready", () => {
  console.info("Ready");
});
rtm.on("disconnecting", () => {
  console.info("Disconnecting");
});
rtm.on("reconnecting", () => {
  console.info("Reconnecting");
});
rtm.on("disconnected", (error) => {
  console.error(`Disconnecting: ${JSON.stringify(error)}`);
});
rtm.on("error", (error) => {
  console.error(`Error: ${JSON.stringify(error)}`);
});
rtm.on("unable_to_rtm_start", (error) => {
  console.error(`Unable to RTM start: ${JSON.stringify(error)}`);
});

(async () => {
  console.log("Looking for sources to start");
  await startSources();
  var app = new Koa();
  var router = new Router();

  router.get("/", (ctx, _) => {
    ctx.body = "Hello World";
  });
  router.get("/:names+", async (ctx, _) => {
    let names = ctx.params.names.split("/") as string[];
    let sources = dbg(
      await Promise.all(names.map((n) => getSource(n as string)))
    );
    await Promise.all(
      sources.filter(notEmpty).map((s) => {
        s.dateLastPolled = new Date();
        return setSource(s);
      })
    );

    let pgn = await replace(
      sources
        .filter(notEmpty)
        .map((s) => s.pgn)
        .join("\n\n")
    );

    ctx.body = pgn;
    ctx.status = 200;
    console.info(`GET: ${ctx.path} -> 200, length: ${pgn.length}`);
  });

  app.use(router.routes()).use(router.allowedMethods());
  app.listen(publicPort, publicIP);

  // Connect to Slack
  await rtm.start();
})();
