import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, LabelBuilder, RoleSelectMenuBuilder } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getColor, getApplicationStatusColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';
import { withErrorHandling, createError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import ApplicationService from '../../services/applicationService.js';
import { 
    getApplicationSettings, 
    saveApplicationSettings, 
    getApplication, 
    getApplications, 
    updateApplication,
    getApplicationRoles,
    saveApplicationRoles,
    getApplicationRoleSettings,
    saveApplicationRoleSettings,
    deleteApplication
} from '../../utils/database.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import appDashboard from './modules/app_dashboard.js';

function getApplicationStatusPresentation(statusValue) {

    const statusLabel =
        normalized === 'pending' ? 'En proceso' :
        normalized === 'approved' ? 'Aceptada' :
        normalized === 'denied' ? 'Rechazada' :
        'Desconocido';

    const statusEmoji =
        normalized === 'pending' ? '🟡' :
        normalized === 'approved' ? '🟢' :
        normalized === 'denied' ? '🔴' :
        '⚪';
}

export default {
    data: new SlashCommandBuilder()
    .setName("app-admin")
    .setDescription("Gestionar solicitudes del equipo")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand((subcommand) =>
        subcommand
            .setName("setup")
            .setDescription("Configurar una nueva solicitud")
    )

    .addSubcommand((subcommand) =>
        subcommand
            .setName("review")
            .setDescription("Aceptar o rechazar una solicitud")
            .addStringOption((option) =>
                option
                    .setName("id")
                    .setDescription("ID de la solicitud")
                    .setRequired(true),
            ),
    )

    .addSubcommand((subcommand) =>
        subcommand
            .setName("list")
            .setDescription("Mostrar todas las solicitudes")
            .addStringOption((option) =>
                option
                    .setName("status")
                    .setDescription("Filtrar por estado")
                    .addChoices(
                        { name: "Pendiente", value: "pending" },
                        { name: "Aceptada", value: "approved" },
                        { name: "Rechazada", value: "denied" },
                    ),
            )
            .addStringOption((option) =>
                option
                    .setName("role")
                    .setDescription("Filtrar por ID del rol"),
            )
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setDescription("Filtrar por usuario"),
            )
            .addNumberOption((option) =>
                option
                    .setName("limit")
                    .setDescription(
                        "Cantidad máxima de solicitudes a mostrar (predeterminado: 10)",
                    )
                    .setMinValue(1)
                    .setMaxValue(25),
            ),
    )

    .addSubcommand((subcommand) =>
        subcommand
            .setName("dashboard")
            .setDescription("Abrir el panel de configuración de solicitudes")
            .addStringOption((option) =>
                option
                    .setName("application")
                    .setDescription("Seleccionar una solicitud para configurar")
                    .setRequired(false)
                    .setAutocomplete(true),
            ),
    ),

    category: "Comunidad",

    execute: withErrorHandling(async (interaction) => {
        if (!interaction.inGuild()) {
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This command can only be used in a server.' });
        }

        const { options, guild, member } = interaction;
        const subcommand = options.getSubcommand();

        if (subcommand !== 'dashboard' && subcommand !== 'setup') {
            await InteractionHelper.safeDefer(interaction, { flags: ['Ephemeral'] });
        }

        logger.info(`App-admin command executed: ${subcommand}`, {
            userId: interaction.user.id,
            guildId: guild.id,
            subcommand
        });

        await ApplicationService.checkManagerPermission(interaction.client, guild.id, member);

        if (subcommand === "setup") {
            await handleSetup(interaction);
        } else if (subcommand === "review") {
            await handleReview(interaction);
        } else if (subcommand === "list") {
            await handleList(interaction);
        } else if (subcommand === "dashboard") {
            const selectedAppName = interaction.options.getString("application");
            await appDashboard.execute(interaction, null, interaction.client, selectedAppName);
        }
    }, { type: 'command', commandName: 'app-admin' })
};

async function handleSetup(interaction) {

    if (interaction.deferred || interaction.replied) {
        return await replyUserError(interaction, {
            type: ErrorTypes.UNKNOWN,
            message: 'Esta interacción ya fue procesada. Intenta ejecutar el comando nuevamente.'
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('app_setup_modal')
        .setTitle('Configurar nueva solicitud');


    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('role_id')
        .setPlaceholder('Selecciona el rol al que los usuarios aplicarán')
        .setRequired(true);


    const roleLabel = new LabelBuilder()
        .setLabel('Rol de solicitud')
        .setDescription('El rol que los usuarios podrán solicitar')
        .setRoleSelectMenuComponent(roleSelect);


    const appNameInput = new TextInputBuilder()
        .setCustomId('app_name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ejemplo: Moderador, Ayudante, Desarrollador')
        .setMaxLength(50)
        .setMinLength(1)
        .setRequired(true);


    const appNameLabel = new LabelBuilder()
        .setLabel('Nombre de la solicitud')
        .setTextInputComponent(appNameInput);


    const q1Input = new TextInputBuilder()
        .setCustomId('app_question_1')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('¿Por qué quieres obtener este rol?')
        .setMaxLength(100)
        .setMinLength(1)
        .setRequired(true);


    const q1Label = new LabelBuilder()
        .setLabel('Pregunta 1 (obligatoria)')
        .setTextInputComponent(q1Input);


    const q2Input = new TextInputBuilder()
        .setCustomId('app_question_2')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('¿Qué experiencia tienes?')
        .setMaxLength(100)
        .setRequired(false);


    const q2Label = new LabelBuilder()
        .setLabel('Pregunta 2 (opcional)')
        .setTextInputComponent(q2Input);


    const q3Input = new TextInputBuilder()
        .setCustomId('app_question_3')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(false);


    const q3Label = new LabelBuilder()
        .setLabel('Pregunta 3 (opcional)')
        .setTextInputComponent(q3Input);


    modal.addLabelComponents(
        roleLabel,
        appNameLabel,
        q1Label,
        q2Label,
        q3Label
    );


    await interaction.showModal(modal);


    const submitted = await interaction.awaitModalSubmit({
        time: 15 * 60 * 1000,
        filter: (i) =>
            i.customId === 'app_setup_modal' &&
            i.user.id === interaction.user.id,
    }).catch(() => null);


    if (!submitted) {
        logger.info(
            'El formulario de configuración fue cerrado o expiró',
            {
                guildId: interaction.guild.id,
                userId: interaction.user.id
            }
        );

        return;
    }


    const appName = submitted.fields
        .getTextInputValue('app_name')
        .trim();


    const selectedRoles = submitted.fields
        .getSelectedRoles('role_id');


    const roleId = selectedRoles.first()?.id;


    if (!roleId) {
        await replyUserError(submitted, {
            type: ErrorTypes.USER_INPUT,
            message: 'Debes seleccionar un rol para la solicitud.'
        });

        return;
    }


    const questions = [
        submitted.fields.getTextInputValue('app_question_1').trim(),
        submitted.fields.getTextInputValue('app_question_2').trim(),
        submitted.fields.getTextInputValue('app_question_3').trim(),
    ].filter(q => q.length > 0);



    const role = await interaction.guild.roles
        .fetch(roleId)
        .catch(() => null);


    if (!role) {
        await replyUserError(submitted, {
            type: ErrorTypes.VALIDATION,
            message: 'El rol seleccionado no pudo ser encontrado.'
        });

        return;
    }



    const existingRoles = await getApplicationRoles(
        interaction.client,
        interaction.guild.id
    );


    if (existingRoles.some(r => r.roleId === roleId)) {
        await replyUserError(submitted, {
            type: ErrorTypes.CONFIGURATION,
            message: `El rol ${role} ya está configurado como una solicitud.`
        });

        return;
    }



    existingRoles.push({
        roleId: roleId,
        name: appName,
        enabled: true,
    });



    await saveApplicationRoles(
        interaction.client,
        interaction.guild.id,
        existingRoles
    );



    const settings = await getApplicationSettings(
        interaction.client,
        interaction.guild.id
    );


    if (!settings.enabled) {
        await ApplicationService.updateSettings(
            interaction.client,
            interaction.guild.id,
            {
                enabled: true
            }
        );
    }



    await saveApplicationRoleSettings(
        interaction.client,
        interaction.guild.id,
        roleId,
        {
            questions
        }
    );



    await submitted.reply({
        embeds: [
            successEmbed(
                '✅ Solicitud creada',
                `La solicitud **${appName}** ha sido creada para ${role}.\n\nPuedes personalizar el canal de registros, roles de administración, preguntas y tiempo de almacenamiento desde el panel de configuración.`
            )
        ],
        flags: ['Ephemeral'],
    });



    setTimeout(() => {
        appDashboard.execute(
            submitted,
            null,
            interaction.client,
            appName
        );
    }, 500);
}

async function handleReview(interaction) {
    const appId = interaction.options.getString("id");

    const application = await getApplication(
        interaction.client,
        interaction.guild.id,
        appId,
    );

    if (!application) {
        return await replyUserError(interaction, {
            type: ErrorTypes.USER_INPUT,
            message: 'Solicitud no encontrada.'
        });
    }

    if (application.status !== "pending") {
        return await replyUserError(interaction, {
            type: ErrorTypes.UNKNOWN,
            message: 'Esta solicitud ya fue procesada.'
        });
    }

    const appEmbed = createEmbed({
        title: `Revisar solicitud`,
        description:
            `**Usuario:** <@${application.userId}>\n` +
            `**Solicitud:** ${application.roleName}\n` +
            `**ID de solicitud:** \`${appId}\``,
        color: 'info',
    });


    if (application.answers && application.answers.length > 0) {
        application.answers.forEach((item, index) => {
            appEmbed.addFields({
                name: `P${index + 1}: ${item.question}`,
                value: item.answer || '*No se proporcionó respuesta*',
                inline: false
            });
        });
    }


    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`app_review_approve_${appId}`)
            .setLabel('Aceptar')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`app_review_deny_${appId}`)
            .setLabel('Rechazar')
            .setStyle(ButtonStyle.Danger),
    );


    await InteractionHelper.safeEditReply(interaction, {
        embeds: [appEmbed],
        components: [buttonRow],
        flags: ["Ephemeral"],
    });


    const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i =>
            i.user.id === interaction.user.id &&
            (
                i.customId.startsWith(`app_review_approve_${appId}`) ||
                i.customId.startsWith(`app_review_deny_${appId}`)
            ),
        time: 300_000,
        max: 1,
    });


    collector.on('collect', async buttonInteraction => {

        const isApprove = buttonInteraction.customId.includes('approve');


        const reasonModal = new ModalBuilder()
            .setCustomId(`app_review_reason_${appId}_${isApprove ? 'approve' : 'deny'}`)
            .setTitle(`${isApprove ? 'Aceptar' : 'Rechazar'} solicitud - Motivo`);


        reasonModal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('review_reason')
                    .setLabel('Motivo (opcional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Escribe el motivo de esta decisión...')
                    .setMaxLength(500)
                    .setRequired(false),
            ),
        );


        await buttonInteraction.showModal(reasonModal);


        try {

            const reasonSubmit = await buttonInteraction.awaitModalSubmit({
                time: 5 * 60 * 1000,
                filter: i =>
                    i.customId === `app_review_reason_${appId}_${isApprove ? 'approve' : 'deny'}` &&
                    i.user.id === buttonInteraction.user.id,
            }).catch(() => null);


            if (!reasonSubmit) return;


            const reason =
                reasonSubmit.fields.getTextInputValue('review_reason').trim()
                || "No se proporcionó un motivo.";


            const action = isApprove ? 'approve' : 'deny';
            const status = isApprove ? 'approved' : 'denied';



            await ApplicationService.reviewApplication(
                reasonSubmit.client,
                interaction.guild.id,
                appId,
                {
                    action,
                    reason,
                    reviewerId: reasonSubmit.user.id
                }
            );



            try {

                const user = await reasonSubmit.client.users.fetch(application.userId);

                const statusColor = getApplicationStatusColor(status);
                const reviewStatus = getApplicationStatusPresentation(status);


                const dmEmbed = createEmbed({

                    title: `${reviewStatus.statusEmoji} Solicitud ${reviewStatus.statusLabel}`,

                    description:
                        `Tu solicitud para **${application.roleName}** ha sido **${status}**\n` +
                        `**Nota:** ${reason}\n\n` +
                        `Usa \`/apply status id:${appId}\` para ver los detalles.`

                }).setColor(statusColor);


                await user.send({
                    embeds: [dmEmbed]
                });


            } catch (error) {

                logger.warn('No se pudo enviar mensaje privado al usuario sobre la revisión de la solicitud', {
                    error: error.message,
                    userId: application.userId,
                    applicationId: appId
                });

            }



            await reasonSubmit.reply({

                embeds: [
                    successEmbed(
                        `Solicitud ${status}`,
                        `La solicitud ha sido **${status}**.`,
                    ),
                ],

                flags: ["Ephemeral"],
            });



        } catch (error) {

            logger.error('Error revisando solicitud:', error);

            await replyUserError(buttonInteraction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Ocurrió un error al revisar la solicitud.'
            });

        }

    });



    collector.on('end', async (collected, reason) => {

        if (reason === 'time') {

            const timeoutEmbed = createEmbed({

                title: 'Tiempo de revisión agotado',

                description:
                    'Los botones de revisión han expirado.',

                color: 'warning',

            });


            await InteractionHelper.safeEditReply(interaction, {

                embeds: [timeoutEmbed],

                components: [],

            }).catch(() => {});
        }

    });

}

async function handleList(interaction) {
    const status = interaction.options.getString("status");
    const user = interaction.options.getUser("user");
    const limit = interaction.options.getNumber("limit") || 10;

    const filters = {};
    
    if (status) {
        filters.status = status;
    } else {
        filters.status = 'pending';
    }

    let applications = await getApplications(
        interaction.client,
        interaction.guild.id,
        filters,
    );

    if (!user) {
        applications = await Promise.all(
            applications.map(async (app) => {
                try {
                    await interaction.guild.members.fetch(app.userId);
                    return app; 
                } catch {
                    
                    await deleteApplication(interaction.client, interaction.guild.id, app.id, app.userId);
                    return null; 
                }
            })
        ).then(results => results.filter(Boolean)); 
    }

    if (user) {
        applications = applications.filter((app) => app.userId === user.id);
    }

    if (applications.length === 0) {
        const applicationRoles = await getApplicationRoles(interaction.client, interaction.guild.id);
        
        if (applicationRoles.length > 0) {
            const embed = createEmbed({ 
                title: "No se encontraron solicitudes", 
                description: "No se encontraron solicitudes enviadas que coincidan con los criterios especificados.\n\nSin embargo, los siguientes roles de solicitud están configurados:" 
            });

            applicationRoles.forEach((appRole, index) => {
                const role = interaction.guild.roles.cache.get(appRole.roleId);

                embed.addFields({
                    name: `${index + 1}. ${appRole.name}`,
                    value: `**Rol:** ${role ? `<@&${appRole.roleId}>` : 'Rol no encontrado'}\n**Disponible para solicitudes:** Sí`,
                    inline: false
                });
            });

            embed.setFooter({
                text: "Los usuarios pueden aplicar con /apply submit o ver los roles disponibles con /apply list"
            });

            return InteractionHelper.safeEditReply(interaction, { 
                embeds: [embed], 
                flags: ["Ephemeral"] 
            });

        } else {
            return await replyUserError(interaction, {
                type: ErrorTypes.CONFIGURATION,
                message: 'No se encontraron solicitudes y no hay roles de solicitud configurados.\n' +
                    'Usa `/app-admin roles add` para configurar los roles de solicitud primero.'
            });
        }
    }

    applications = applications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

    const embed = createEmbed({ 
        title: "Solicitudes enviadas", 
        description: `Mostrando ${applications.length} solicitudes.`,
    });

    applications.forEach((app) => {
        const statusView = getApplicationStatusPresentation(app?.status);
        const roleName = app?.roleName || 'Rol desconocido';
        const username = app?.username || 'Usuario desconocido';
        const createdAt = app?.createdAt ? new Date(app.createdAt) : null;

        const createdAtDisplay = createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString()
            : 'Fecha desconocida';

        embed.addFields({
            name: `${statusView.statusEmoji} ${roleName} - ${username}`,
            value:
                `**ID:** \`${app.id}\`\n` +
                `**Estado:** ${statusView.statusEmoji} ${statusView.statusLabel}\n` +
                `**Fecha:** ${createdAtDisplay}`,
            inline: true,
        });
    });

    await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
        flags: ["Ephemeral"],
    });
}
