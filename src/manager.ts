import { ShardingManager } from "discord.js";

const manager = new ShardingManager('dist/client.js', {
    token: process.env.DISCORD_TOKEN
})

manager.spawn({ amount: 'auto' })

export { manager }