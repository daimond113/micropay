import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageActionRow, MessageAttachment, MessageButton } from "discord.js";
import { createCanvas, loadImage, registerFont } from "canvas";
import { join } from "path";
import { formatCurrency, dbClient } from "../utils";
import { nanoid } from "nanoid/async";

const basePath = join(process.cwd(), 'assets');

registerFont(join(basePath, 'Poppins-Regular.ttf'), { family: 'Poppins' })
registerFont(join(basePath, 'Poppins-SemiBold.ttf'), { family: 'Poppins' })
registerFont(join(basePath, 'Poppins-ExtraBold.ttf'), { family: 'Poppins' })


export default {
    data: new SlashCommandBuilder()
        .setName('request')
        .setDescription('Request money from someone')
        .setDMPermission(false)
        .addUserOption((o) => o
            .setName('user')
            .setDescription('The user to request money from')
            .setRequired(true)
        )
        .addIntegerOption((o) => o
            .setName('amount')
            .setDescription('The amount to request')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000000)
        ),
    run: async (i: CommandInteraction) => {
        if (!i.inGuild()) return (i as CommandInteraction).editReply('You must be in a guild to use this command')
        const user = i.options.getUser('user', true)
        if (user.id === i.user.id || user.bot) return i.editReply('You cannot request money from yourself or bots')
        const amount = i.options.getInteger('amount', true)
        if (amount <= 0) return i.editReply('You cannot request 0 or negative money')
        const canvas = createCanvas(600, 535)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#eadcf5'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const image = await loadImage(join(basePath, 'pay_logo.png'))
        const imgWidth = 170
        ctx.drawImage(image, canvas.width / 2 - imgWidth / 2, 40, imgWidth, 75)

        ctx.fillStyle = '#000000'
        ctx.font = '33px Poppins semibold'
        const requesterWidth = ctx.measureText(i.user.username).width
        ctx.fillText(i.user.username, canvas.width / 2 - requesterWidth / 2, 200)

        ctx.font = '26px Poppins'
        const requestingWidth = ctx.measureText(`is requesting`).width
        ctx.fillText('is requesting', canvas.width / 2 - requestingWidth / 2, 260)

        ctx.font = '75px Poppins extrabold'
        const amountFormatted = await formatCurrency(i.options.getInteger('amount', true), i.guildId)
        const amountWidth = ctx.measureText(amountFormatted).width
        ctx.fillText(amountFormatted, canvas.width / 2 - amountWidth / 2, 350)

        ctx.font = '26px Poppins'
        const fromWidth = ctx.measureText('from').width
        ctx.fillText('from', canvas.width / 2 - fromWidth / 2, 400)

        ctx.font = '33px Poppins semibold'
        const srcWidth = ctx.measureText(user.username).width
        ctx.fillText(user.username, canvas.width / 2 - srcWidth / 2, 460)

        const id = await nanoid()

        await i.editReply({
            files: [
                new MessageAttachment(canvas.toBuffer(), 'request.png')
                    .setDescription(`A request of ${amountFormatted} from ${user.username} by ${i.user.username}`)
            ],
            components: [
                new MessageActionRow()
                    .setComponents(
                        new MessageButton()
                            .setStyle('PRIMARY')
                            .setLabel('Accept')
                            .setCustomId(`accept-${id}`)
                    )
            ]
        })
        i.channel?.awaitMessageComponent({
            time: 120_000,
            filter: (c) => {
                const cond = c.customId === `accept-${id}` && c.user.id === user.id
                if (!cond) c.reply('You cannot accept this request')
                return cond
            },
        })
            .then(async (_i) => {
                await _i.deferReply()
                const img = await dbClient.sendMoneyFromTo(user.id, i.user.id, amount, i.guildId).then(() => 'success').catch(() => 'fail')
                const image = join(process.cwd(), 'assets', `payment_${img}.gif`)
                _i.editReply({
                    files: [image],
                })
            })
            .catch(() => undefined)
            .finally(() => {
                i.editReply({
                    components: [],
                    files: [],
                    content: 'Request ended'
                })
            })
    }
}