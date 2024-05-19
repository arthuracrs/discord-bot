import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import playdl from 'play-dl';

const queues = new Map();

const playNextInQueue = async (interaction, queue) => {
    if (!queue.length) {
        await interaction.followUp('Queue is empty.');
        return;
    }

    const url = queue[0];
    const voiceChannel = interaction.member.voice.channel;
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    try {
        const stream = await playdl.stream(url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        player.play(resource);
        await interaction.followUp(`Now playing: ${url}`);

        player.on(AudioPlayerStatus.Idle, async () => {
            queue.shift();
            await playNextInQueue(interaction, queue);
        });

    } catch (error) {
        console.error(error);
        await interaction.followUp('An error occurred while trying to play the audio.');
        queue.shift();
        await playNextInQueue(interaction, queue);
    }
};

export default [
    {
        data: new SlashCommandBuilder()
            .setName('youtube')
            .setDescription("Play audio from a YouTube video in your voice channel.")
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('The YouTube URL of the audio to play')
                    .setRequired(true)),
        async execute(interaction) {
            try {
                const url = interaction.options.getString('url');
                if (!url) {
                    await interaction.reply('You need to provide a YouTube URL!');
                    return;
                }

                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel) {
                    await interaction.reply('You need to join a voice channel first!');
                    return;
                }

                await interaction.deferReply();

                let queue = queues.get(interaction.guild.id);
                if (!queue) {
                    queue = [];
                    queues.set(interaction.guild.id, queue);
                }

                queue.push(url);

                if (queue.length === 1) {
                    await playNextInQueue(interaction, queue);
                } else {
                    await interaction.followUp('Added to the queue.');
                }

            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('An error occurred while trying to play the audio.');
                } else {
                    await interaction.reply('An error occurred while trying to play the audio.');
                }
            }
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('next')
            .setDescription("Skip the current song and play the next one in the queue."),
        async execute(interaction) {
            try {
                const queue = queues.get(interaction.guild.id);
                if (!queue || queue.length === 0) {
                    await interaction.reply('The queue is empty.');
                    return;
                }

                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel) {
                    await interaction.reply('You need to join a voice channel first!');
                    return;
                }

                await interaction.deferReply();
                queue.shift();
                await playNextInQueue(interaction, queue);

            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('An error occurred while trying to skip the song.');
                } else {
                    await interaction.reply('An error occurred while trying to skip the song.');
                }
            }
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('clearqueue')
            .setDescription("Clear the entire queue."),
        async execute(interaction) {
            try {
                const queue = queues.get(interaction.guild.id);
                if (!queue || queue.length === 0) {
                    await interaction.reply('The queue is already empty.');
                    return;
                }

                queues.set(interaction.guild.id, []);

                const voiceChannel = interaction.member.voice.channel;
                if (voiceChannel) {
                    const connection = getVoiceConnection(interaction.guild.id);
                    if (connection) {
                        connection.destroy();
                    }
                }

                await interaction.reply('The queue has been cleared.');

            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('An error occurred while trying to clear the queue.');
                } else {
                    await interaction.reply('An error occurred while trying to clear the queue.');
                }
            }
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('youtubeplaylist')
            .setDescription("Play audio from a YouTube playlist in your voice channel.")
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('The YouTube playlist URL to play')
                    .setRequired(true)),
        async execute(interaction) {
            try {
                const url = interaction.options.getString('url');
                if (!url) {
                    await interaction.reply('You need to provide a YouTube playlist URL!');
                    return;
                }

                const playlistInfo = await playdl.playlist_info(url, { incomplete: true });

                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel) {
                    await interaction.reply('You need to join a voice channel first!');
                    return;
                }

                await interaction.deferReply();

                let queue = queues.get(interaction.guild.id);
                if (!queue) {
                    queue = [];
                    queues.set(interaction.guild.id, queue);
                }

                for (const video of playlistInfo.videos) {
                    queue.push(video.url);
                }

                if (queue.length === playlistInfo.videos.length) {
                    await playNextInQueue(interaction, queue);
                } else {
                    await interaction.followUp('Added playlist to the queue.');
                }

            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('An error occurred while trying to play the playlist.');
                } else {
                    await interaction.reply('An error occurred while trying to play the playlist.');
                }
            }
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('disconnect')
            .setDescription("Disconnect the bot from the voice channel."),
        async execute(interaction) {
            try {
                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel) {
                    await interaction.reply('You need to join a voice channel first!');
                    return;
                }

                const connection = getVoiceConnection(interaction.guild.id);
                if (connection) {
                    connection.destroy();
                    queues.delete(interaction.guild.id); // Clear queue when disconnecting
                    await interaction.reply('Successfully disconnected the bot from the voice channel.');
                } else {
                    await interaction.reply('The bot is not connected to any voice channel.');
                }
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('An error occurred while trying to disconnect the bot.');
                } else {
                    await interaction.reply('An error occurred while trying to disconnect the bot.');
                }
            }
        },
    },
];
