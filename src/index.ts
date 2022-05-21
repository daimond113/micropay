import Fastify from 'fastify'
import { manager } from './manager'
import RateLimit, { RateLimitOptions } from '@fastify/rate-limit'
import { dbClient } from './utils'
import { Guild } from 'discord.js'
import Cors from '@fastify/cors'
import ms from 'ms'
const fastify = Fastify({ logger: true })
let invite: string

fastify.register(RateLimit, {
    max: 50,
    timeWindow: '1 minute'
})

fastify.register(Cors)


fastify.get<{ Params: { guildId: string }, Headers: { 'x-dapi-id': string, 'x-frontend-key': string } }>('/:guildId/config', {
    schema: {
        params: {
            type: 'object',
            properties: {
                guildId: { type: 'string' }
            },
            required: ['guildId']
        },
        headers: {
            type: 'object',
            properties: {
                'x-dapi-id': { type: 'string' },
                'x-frontend-key': { type: 'string' }
            },
            required: ['x-dapi-id', 'x-frontend-key']
        }
    },
    config: {
        rateLimit: {
            max: 100,
            timeWindow: '1 minute'
        } as RateLimitOptions
    }
}, async (req, res) => {
    const guildId = req.params.guildId
    const tokenId = req.headers['x-dapi-id']
    const key = req.headers['x-frontend-key']
    if (!tokenId || !key) return res.code(401).send('Invalid token or key')
    if (key !== process.env.FRONTEND_AUTH) return res.code(401).send('This endpoint is only accessible via the frontend')
    const guild = (await manager.broadcastEval((c, { guildId }) => c.guilds.cache.get(guildId), { context: { guildId } }) as (Guild | undefined)[]).find((v) => v !== undefined)
    if (guild?.ownerId !== tokenId) return res.code(401).send('You are not the owner of this guild')
    const config = await dbClient.getGuildConfig(guildId)
    return res.send(config)
})

fastify.get<{ Headers: { 'x-api-token': string } }>('/config', {
    schema: {
        headers: {
            type: 'object',
            properties: {
                'x-api-token': { type: 'string' }
            },
            required: ['x-api-token']
        }
    },
    config: {
        rateLimit: {
            max: 10,
            timeWindow: '2 minute'
        } as RateLimitOptions
    }
}, async (req, res) => {
    const token = req.headers['x-api-token']
    if (!token) return res.code(401).send('Invalid token')
    const config = await dbClient.findByApiToken(token)
    if (!config) return res.code(401).send('Invalid token')
    const { apiToken, ...Config } = config
    return res.send(Config)
})

fastify.post<{ Headers: { 'x-api-token': string }, Params: { guildId: string }, Body: { currency?: string, currencyBefore?: boolean } }>('/config', {
    schema: {
        body: {
            type: 'object',
            properties: {
                currency: { type: 'string' },
                currencyBefore: { type: 'boolean' },
            }
        },
        headers: {
            type: 'object',
            properties: {
                'x-api-token': { type: 'string' },
            },
            required: ['x-api-token']
        },
    },
    config: {
        rateLimit: {
            max: 5,
            timeWindow: '1 minute'
        } as RateLimitOptions
    }
},
    async (req, res) => {
        const token = req.headers['x-api-token']
        const body = req.body
        const guild = token && await dbClient.findByApiToken(token)
        if (!token || !guild) return res.code(401).send('Invalid token')
        if (!body.currency || !dbClient.filterCurrency(body.currency) || !('currencyBefore' in body)) return res.code(400).send('Invalid body')
        const guildId = guild.id
        await dbClient.setGuildConfig(guildId, {
            ...(await dbClient.getGuildConfig(guildId)),
            currency: body.currency,
            currencyBefore: body.currencyBefore
        })
        return res.send({ success: true })
    }
)

fastify.post<{ Params: { guildId: string }, Headers: { 'x-dapi-id': string, 'x-frontend-key': string } }>('/:guildId/token/regenerate', {
    schema: {
        params: {
            type: 'object',
            properties: {
                guildId: { type: 'string' }
            },
            required: ['guildId']
        },
        headers: {
            type: 'object',
            properties: {
                'x-dapi-id': { type: 'string' },
                'x-frontend-key': { type: 'string' }
            },
            required: ['x-dapi-id', 'x-frontend-key']
        }
    },
    config: {
        rateLimit: {
            max: 5,
            timeWindow: '30 minutes'
        } as RateLimitOptions
    }
}, async (req, res) => {
    const guildId = req.params.guildId
    const tokenId = req.headers['x-dapi-id']
    const key = req.headers['x-frontend-key']
    if (!tokenId || !key) return res.code(401).send('Invalid token or key')
    if (key !== process.env.FRONTEND_AUTH) return res.code(401).send('This endpoint is only accessible via the frontend')
    const guild = (await manager.broadcastEval((c, { guildId }) => c.guilds.cache.get(guildId), { context: { guildId } }) as (Guild | undefined)[]).find((v) => v !== undefined)
    if (guild?.ownerId !== tokenId) return res.code(401).send('You are not the owner of this guild')
    const token = await dbClient.regenerateToken(guildId)
    return res.send({ apiToken: token })
}
)

fastify.get<{ Params: { id: string } }>('/is-in/:id', {
    schema: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'string' }
            },
            required: ['id']
        }
    },
    config: {
        rateLimit: {
            max: 150,
            timeWindow: '1 minute'
        } as RateLimitOptions
    }
}, async (req, res) => {
    const id = req.params.id
    const guild = await (await manager.broadcastEval((c, { id }) => c.guilds.cache.get(id), { context: { id } }) as (Guild | undefined)[]).find((v) => v !== undefined)
    return res.send(Boolean(guild))
})

fastify.post<{ Params: { userId: string }, Body: { amount: number }, Headers: { 'x-api-token': string } }>('/:userId/money/', {
    schema: {
        params: {
            type: 'object',
            properties: {
                userId: { type: 'string' }
            },
            required: ['userId']
        },
        body: {
            type: 'object',
            properties: {
                amount: { type: 'number' },
            },
            required: ['amount']
        },
        headers: {
            type: 'object',
            properties: {
                'x-api-token': { type: 'string' },
            },
            required: ['x-api-token']
        }
    },
    config: {
        rateLimit: {
            max: 5,
            timeWindow: '1 minute'
        } as RateLimitOptions
    }
}, async (req, res) => {
    const { userId } = req.params
    const { amount } = req.body
    const token = req.headers['x-api-token']
    if (!token) return res.code(401).send('Invalid token')
    const config = await dbClient.findByApiToken(token)
    if (!config) return res.code(401).send('Invalid token')
    await dbClient.giveMoney(userId, amount, config.id)
    return res.send({ success: true })
})

fastify.get('/invite', {
    config: {
        rateLimit: {
            max: 500,
            timeWindow: '1 minute'
        } as RateLimitOptions
    }
}, async () => {
    return {
        invite: (invite ??= await manager.broadcastEval((c) => c.generateInvite({
            scopes: ['bot', 'applications.commands'],
        }), { shard: 0 }))
    }
})

fastify.get('/', async () => {
    return `Up for ${ms(process.uptime() * 1000, { long: true })}`
})

fastify.listen(
    parseInt(process.env.PORT ?? '3000'),
    process.env.SERVER_ADDRESS ?? '127.0.0.1'
).then(console.log)