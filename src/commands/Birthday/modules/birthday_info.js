import { EmbedBuilder } from 'discord.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const userId = targetUser.id;
        const guildId = interaction.guildId;

        const birthdayData = await getUserBirthday(client, guildId, userId);

        if (!birthdayData) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cumpleaños no encontrado')
                .setDescription(
                    targetUser.id === interaction.user.id
                        ? 'Aún no has configurado tu cumpleaños. Usa `/birthday set` para agregarlo.'
                        : `${targetUser.username} aún no ha configurado su cumpleaños.`
                );

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Información del cumpleaños')
            .setDescription(
                `**Fecha:** ${birthdayData.day} de ${birthdayData.monthName}\n**Usuario:** ${targetUser.toString()}`
            );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Información del cumpleaños obtenida correctamente', {
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            guildId,
            commandName: 'birthday_info'
        });
    }
};
