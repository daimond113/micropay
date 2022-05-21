import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { dbClient } from "../utils";

export default {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure MicroDaiDai Pay for this server')
        .setDefaultMemberPermissions('0')
        .setDMPermission(false)
        .addStringOption((o) => o
            .setName('currency')
            .setDescription('The currency to use')
            .setRequired(false)
        )
        .addBooleanOption((o) => o
            .setName('currency-before')
            .setDescription('Whether to show the currency before the amount')
            .setRequired(false)
        ),
    run: async (i: CommandInteraction) => {
        if (!i.inGuild()) return (i as CommandInteraction).editReply('You must be in a guild to use this command')
        const currency = i.options.getString('currency', false)
        const currencyBefore = i.options.getBoolean('currency-before', false)
        const data = await dbClient.getGuildConfig(i.guildId)
        if (currency) {
            if (!dbClient.filterCurrency(currency)) return (i as CommandInteraction).editReply('The currency must be alphanumeric and 3 symbols at max or a currency symbol')
            data.currency = currency
        }
        if (typeof currencyBefore === 'boolean') data.currencyBefore = currencyBefore
        await dbClient.setGuildConfig(i.guildId, data)
        i.editReply('Configuration updated')
    }
}