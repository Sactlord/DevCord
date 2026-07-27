import { EmbedBuilder } from 'discord.js';
import { getUpcomingBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const next5 = await getUpcomingBirthdays(client, interaction.guildId, 5);

        if (next5.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ No se encontraron cumpleaños')
                .setDescription('Aún no se ha registrado ningún cumpleaños en este servidor. Usa `/birthday set` para agregar el tuyo.');

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);

            if (!member) {
                deleteBirthday(client, interaction.guildId, birthday.userId).catch(() => null);
                continue;
            }

            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **¡Hoy!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **¡Mañana!**';
            } else {
                timeUntil = `En ${birthday.daysUntil} día${birthday.daysUntil > 1 ? 's' : ''}`;
            }
        }

        if (displayIndex === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ No hay próximos cumpleaños')
                .setDescription('No se encontraron próximos cumpleaños de los miembros actuales del servidor.');

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let birthdayList = `🎂 **Próximos 5 cumpleaños**\n\nEstos son los próximos 5 cumpleaños en **${interaction.guild.name}**:\n\n`;

        displayIndex = 0;

        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);

            if (!member) {
                continue;
            }

            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **¡Hoy!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **¡Mañana!**';
            } else {
                timeUntil = `En ${birthday.daysUntil} día${birthday.daysUntil > 1 ? 's' : ''}`;
            }

            birthdayList += `${displayIndex}. **${member.displayName}**\n<@${birthday.userId}>\n📅 **Fecha:** ${birthday.day} de ${birthday.monthName}\n⏰ **Falta:** ${timeUntil}\n\n`;
        }

        birthdayList += 'Usa `/birthday set` para registrar tu cumpleaños.';

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎂 Próximos 5 cumpleaños')
            .setDescription(birthdayList);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Próximos cumpleaños obtenidos correctamente', {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            upcomingCount: displayIndex,
            commandName: 'next_birthdays'
        });
    }
};
