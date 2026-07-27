import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import birthdaySet from './modules/birthday_set.js';
import birthdayInfo from './modules/birthday_info.js';
import birthdayList from './modules/birthday_list.js';
import birthdayRemove from './modules/birthday_remove.js';
import nextBirthdays from './modules/next_birthdays.js';
import birthdaySetchannel from './modules/birthday_setchannel.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Comandos del sistema de cumpleaños')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Configura tu cumpleaños')
                .addIntegerOption(option =>
                    option
                        .setName('month')
                        .setDescription('Mes de nacimiento (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('day')
                        .setDescription('Día de nacimiento (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Ver información del cumpleaños')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Usuario del cual quieres ver el cumpleaños')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Mostrar todos los cumpleaños del servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Eliminar tu cumpleaños')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('next')
                .setDescription('Mostrar los próximos cumpleaños')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Configurar o desactivar el canal de anuncios de cumpleaños. (Requiere Administrar servidor)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Canal de texto para los anuncios. Déjalo vacío para desactivar.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set':
                return await birthdaySet.execute(interaction, config, client);

            case 'info':
                return await birthdayInfo.execute(interaction, config, client);

            case 'list':
                return await birthdayList.execute(interaction, config, client);

            case 'remove':
                return await birthdayRemove.execute(interaction, config, client);

            case 'next':
                return await nextBirthdays.execute(interaction, config, client);

            case 'setchannel':
                return await birthdaySetchannel.execute(interaction, config, client);

            default:
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: 'Subcomando desconocido'
                });
        }
    }
};
