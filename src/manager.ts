import { ShardingManager } from "discord.js";

const manager = new ShardingManager('dist/client.js', {
    token: process.env.DISCORD_TOKEN
})

manager.on('shardCreate', (shard) => {
    shard.on("ready", () => {
        shard.eval((c, { shardId }) => {
            c.user?.setPresence({
                status: 'online',
                shardId,
                activities: [
                    {
                        name: `money, shard ${shardId}`,
                        type: 'WATCHING'
                    }
                ]
            })
        }, {
            shardId: shard.id
        })
    })
})

manager.spawn({ amount: 'auto' })

export { manager }