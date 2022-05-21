import { Client, Intents } from "discord.js";
import { commands, dbClient } from "./utils";
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
    ],
    presence: {
        activities: [
            {
                name: 'money',
                type: "WATCHING"
            }
        ]
    }
})

client.on('ready', () => {
    console.log('Ready!');
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
    ; (await dbClient.guildsCollection).deleteOne({ id: g.id })
    ; (await dbClient.accountsCollection).deleteMany({ guild: g.id })
})

client.login(process.env.DISCORD_TOKEN)