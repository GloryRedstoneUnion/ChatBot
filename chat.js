const URL = Java.type("java.net.URL")
const BufferedReader = Java.type("java.io.BufferedReader")
const InputStreamReader = Java.type("java.io.InputStreamReader")
const OutputStreamWriter = Java.type("java.io.OutputStreamWriter")

const NVIDIA_BASE_URL = ""
const NVIDIA_API_KEY = ""
const NVIDIA_MODEL = ""

//记忆池
let memory = []

function call(USER_PROMPT) {

    let url = new URL(NVIDIA_BASE_URL + "/chat/completions")
    let conn = url.openConnection()

    conn.setRequestMethod("POST")

    conn.setRequestProperty("Content-Type", "application/json")
    conn.setRequestProperty("Authorization", "Bearer " + NVIDIA_API_KEY)

    conn.setDoOutput(true)
    conn.setDoInput(true)

    //system prompt
    const SYSTEM_PROMPT = `
    你是一个聊天助手，你需要严格遵循以下事项：
    1. 请尽量简洁的回答问题，不模棱两可
    2. 禁止使用表情，小节号之类Minecraft不可以接受的非法字符
    3. 请控制聊天字数在255字符之内
    `

    let messages = []

    // system 永远放最前
    messages.push({
        role: "system",
        content: SYSTEM_PROMPT
    })

    // 加入历史记忆
    for (let i = 0; i < memory.length; i++) {
        messages.push(memory[i])
    }

    // 当前用户输入
    messages.push({
        role: "user",
        content: USER_PROMPT
    })

    let body = JSON.stringify({
        model: NVIDIA_MODEL,
        messages: messages,
        temperature: 0.7
    })

    let writer = new OutputStreamWriter(conn.getOutputStream(), "UTF-8")
    writer.write(body)
    writer.flush()
    writer.close()

    let code = conn.getResponseCode()

    let stream = (code >= 200 && code < 300)
        ? conn.getInputStream()
        : conn.getErrorStream()

    let reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"))

    let line
    let result = ""

    while ((line = reader.readLine()) != null) {
        result += line
    }

    reader.close()

    Chat.log("HTTP状态码: " + code)
    Chat.log("原始返回: " + result)

    if (code >= 200 && code < 300) {
        let json = JSON.parse(result)
        let reply = json.choices[0].message.content

        memory.push({
            role: "user",
            content: USER_PROMPT
        })

        memory.push({
            role: "assistant",
            content: reply
        })

        if (memory.length > 20) {
            memory = memory.slice(memory.length - 20)
        }

        return reply
    }

    return "请求失败: " + result
}


JsMacros.on("RecvMessage", JavaWrapper.methodToJava(event => {

    let msg = event.text.getString();

    let match = msg.match(/^<([^>]+)> \.(.+)$/);

    if (!match) {
        return
    }

    Chat.log("玩家: " + match[1])
    Chat.log("内容: " + match[2])

    let res = call(match[2])
    Chat.say(res)
}))