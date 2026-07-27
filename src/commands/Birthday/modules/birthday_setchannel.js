import { PermissionsBitField, EmbedBuilder, MessageFlags } from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../../../services/config/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Permiso denegado')
                .setDescription('Necesitas el permiso de **Administrar servidor** para configurar el canal de cumpleaños.');

            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');
            const guildId = interaction.guildId;
            const guildConfig = await getGuildConfig(client, guildId);

            if (channel) {
                guildConfig.birthdayChannelId = channel.id;
                await setGuildConfig(client, guildId, guildConfig);

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Anuncios de cumpleaños activados')
                    .setDescription(`Los anuncios de cumpleaños ahora se enviarán en ${channel}.`);

                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                guildConfig.birthdayChannelId = null;
                await setGuildConfig(client, guildId, guildConfig);

                const embed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('⚠️ Anuncios de cumpleaños desactivados')
                    .setDescription('No se proporcionó ningún canal, por lo que los anuncios de cumpleaños han sido desactivados.');

                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (error) {
            logger.error('birthday_setchannel error:', error);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ Error de configuración')
                .setDescription('No se pudo guardar la configuración del canal de cumpleaños.');

            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
