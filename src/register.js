import { config } from 'dotenv';
config({ path: '.env' });

import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { clientId, guildId, token } = {
    clientId:process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    token: process.env.TOKEN
}

const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const { default: commandOrCommands } = await import(filePath);

        if (Array.isArray(commandOrCommands)) {
            commandOrCommands.forEach(command => {
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] A command in ${filePath} is missing a required "data" or "execute" property.`);
                }
            });
        } else if ('data' in commandOrCommands && 'execute' in commandOrCommands) {
            commands.push(commandOrCommands.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log('Successfully deleted all guild commands.');

        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Successfully deleted all application commands.');

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
