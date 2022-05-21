import { ApplicationCommandDataResolvable, Client, Intents } from "discord.js";
import { Collections, commands, dbClient } from "./utils";
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES
] 
})

client.on('ready', () => {
    console.log('Ready!');
})

client.on('messageCreate', async (m) => {
    if (!m.inGuild()) return
    if (m.content.startsWith('!deploy')) {
        await m.channel.send('Deploying...')
        console.log(commands.map((v) => v.data.toJSON()))
        await m.guild.commands.set(commands.map((v) => v.data.toJSON()) as ApplicationCommandDataResolvable[])
        await m.channel.send('deployed!')
    } else if (m.content.startsWith('!dedeploy')) {
        await m.channel.send('Dedeplying...')
        await m.guild.commands.set([])
        await m.channel.send('dedeployed!')
    }
})

client.on('interactionCreate', async (i) => {
    if (!i.isCommand()) return
    const command = commands.get(i.commandName)
    await i.deferReply({
        ephemeral: i.commandName !== 'request'
    })
    if (!command) return
    await command.run(i)
})

client.on('guildDelete', async (g) => {
    ;(await dbClient.guildsCollection).deleteOne({ id: g.id })
    ;(await dbClient.accountsCollection).deleteMany({ guild: g.id })
})

client.login(process.env.DISCORD_TOKEN)