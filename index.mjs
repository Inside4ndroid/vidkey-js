import { webcrack } from "webcrack"
import { Deobfuscator } from "deobfuscator"
import fetch from "node-fetch"
import { assert } from "console"
import { writeFile } from "node:fs/promises"

async function deobfuscationChain(obfuscatedScript, deobfsSteps) {
    let deobfs = obfuscatedScript
    for (const func of deobfsSteps) {
        deobfs = await deobfuscationLoop(deobfs, func)
    }
    return deobfs
}

async function deobfuscationLoop(obfuscatedInput, loopFunction) {
    let deobfuscated = obfuscatedInput
    for (let run = 0; run < 5; run++) {
        try {
            const result = await loopFunction(deobfuscated)
            if (result == "" || result == undefined) break
            deobfuscated = result
        } catch (e) {
            console.error(e)
            break
        }
    }
    return deobfuscated
}

const synchrony = new Deobfuscator()
const webcrackStep = async (x) => await webcrack(x).code
const synchronyStep = async (x) => await synchrony.deobfuscateSource(x)
const checkDeobfs = (x) => x.indexOf("<video />") !== -1
let obfuscatedScript;
let deobfuscatedScript;

async function getDeobfuscatedScript() {
    while (true) {
        const result = await webcrack(obfuscatedScript, {
            jsx: true,
            unpack: true,
            unminify: true,
            deobfuscate: true,
            mangle: false,
        });

        deobfuscatedScript = result.code;

        const result2 = await webcrack(deobfuscatedScript, {
            jsx: true,
            unpack: true,
            unminify: true,
            deobfuscate: true,
            mangle: false,
        });

        deobfuscatedScript = result2.code;

        const result3 = await webcrack(deobfuscatedScript, {
            jsx: true,
            unpack: true,
            unminify: true,
            deobfuscate: true,
            mangle: false,
        });

        deobfuscatedScript = result3.code;

        deobfuscatedScript = await deobfuscationChain(deobfuscatedScript, [webcrackStep, synchronyStep]);

        console.log(deobfuscatedScript);

        if (checkDeobfs(deobfuscatedScript)) {
            return deobfuscatedScript;
        } else {
            obfuscatedScript = deobfuscatedScript;
        }
    }
}

async function run() {
    const vidplayHost = "https://vidplay.online";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/120.0",
        "Referer": vidplayHost + "/e/",
        "Origin": vidplayHost
    }

    const vidplayHtml = await fetch(`${vidplayHost}/e/`, { headers }).then(async (x) => await x.text())
    const codeVersion = vidplayHtml.match(/embed.js\?v=(\w+)/)[1]
    const scriptUrl = `${vidplayHost}/assets/mcloud/min/embed.js?v=${codeVersion}`

    obfuscatedScript = await fetch(scriptUrl, { headers }).then(async (x) => await x.text())

    const deobfuscated = await getDeobfuscatedScript()

    if (checkDeobfs(deobfuscated)) {
        const start = deobfuscated.substring(deobfuscated.indexOf("<video />"))
        const end = start.substring(0, start.indexOf(".replace"))
        const keys = Array.from(end.matchAll(/'(\w+)'/g), x => x[1])
        assert(keys.length == 2, "Invalid array length!")

        console.info("Success!")
        await writeFile("keys.json", JSON.stringify(keys), "utf8")
    } else {
        console.error("FAIL!")
        await writeFile("failed.js", deobfuscated, "utf8")
    }
}

run();
