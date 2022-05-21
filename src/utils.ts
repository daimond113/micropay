import { SlashCommandBuilder } from "@discordjs/builders";
import { Collection, CommandInteraction } from "discord.js";
import glob from "fast-glob";
import { MongoClient } from "mongodb";
import { nanoid } from "nanoid";

const _dbClient = new MongoClient(process.env.MONGODB_URL!)

export const commands = new Collection<string, Command>()

interface Command {
    data: SlashCommandBuilder
    run: (i: CommandInteraction) => Promise<void>
}

glob('dist/commands/**/*.js').then((files) => {
    files.forEach(async (file) => {
        const { default: command } = await import(file.replace('dist', '.'))
        commands.set(command.data.name, command)
    })
})

export interface Account {
    balance: number
    id: string
    guild: string
}

export class DBClient {
    public db = _dbClient.connect().then(client => client.db())

    public accountsCollection = this.db.then(db => db.collection<Account>('accounts'))
    public guildsCollection = this.db.then(db => db.collection<InternalGuildConfig>('guilds'))
    public filterCurrency = (currency: string) => currency.length > 1 && currency.length < 4 && /(^[a-zA-Z0-9]+$)|([\$\xA2-\xA5\u058F\u060B\u07FE\u07FF\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20C0\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]|\uD807[\uDFDD-\uDFE0]|\uD838\uDEFF|\uD83B\uDCB0)/.test(currency)
    private _genAPIKey = () => nanoid(40)

    public async getAccount(ofId: string, guildId: string): Promise<Account> {
        const acc = await this.accountsCollection.then(c => c.findOne({ id: ofId, guild: guildId }))
        if (acc) return acc 
        await this.accountsCollection.then(c => c.insertOne({ id: ofId, balance: 0, guild: guildId }))
        return {
            balance: 0,
            id: ofId,
            guild: guildId
        }
    }

    public async getGuildConfig(guildId: string): Promise<GuildConfig> {
        const config = await this.guildsCollection.then(c => c.findOne({ id: guildId }))
        if (config) return config
        await this.guildsCollection.then(c => c.insertOne({ id: guildId, currency: '$', apiToken: this._genAPIKey() }))
        return {
            id: guildId,
            currency: '$'
        }
    }

    public async setGuildConfig(guildId: string, config: GuildConfig) {
        await this.guildsCollection.then(c => c.updateOne({ id: guildId }, { $set: config }))
    }
    
    public async sendMoneyFromTo(fromId: string, toId: string, amount: number, guildId: string) {
        const from = await this.getAccount(fromId, guildId)
        // issue an account if one doesn't exist
        await this.getAccount(toId, guildId)
        if (from.balance < amount) throw new Error("Insufficient funds")
        await this.accountsCollection.then(c => c.updateOne({ id: fromId, guild: guildId }, { $inc: { balance: -amount } }))
        await this.accountsCollection.then(c => c.updateOne({ id: toId, guild: guildId }, { $inc: { balance: amount } }))
    }

    public async findByApiToken(token: string): Promise<InternalGuildConfig | null> {
        return await this.guildsCollection.then(c => c.findOne({ apiToken: token }))
    }

    public async regenerateToken(guildId: string) {
        const token = this._genAPIKey()
        await this.guildsCollection.then(c => c.updateOne({ id: guildId }, { $set: { apiToken: token } }))
        return token
    }

    public async giveMoney(toId: string, amount: number, guildId: string) {
        await this.accountsCollection.then(c => c.updateOne({ id: toId, guild: guildId }, { $inc: { balance: amount } }))
    }
}

export const dbClient = new DBClient()

export interface GuildConfig {
    currency: string
    currencyBefore?: boolean
    id: string
}

export interface InternalGuildConfig extends GuildConfig {
    apiToken: string
}


export async function formatCurrency(amount: number, config: GuildConfig | string) {
    if (typeof config === 'string') config = await dbClient.getGuildConfig(config)
    return `${config.currencyBefore ? config.currency : ''}${amount}${config.currencyBefore ? '' : config.currency}`
}