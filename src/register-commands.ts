/**
 * Script to register Discord commands for SyncFM
 * Registers both the "Convert to SyncFM" context menu and the "/share" slash command
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';

interface CommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
}

interface Command {
  name: string;
  type: number;
  description?: string;
  options?: CommandOption[];
  integration_types?: number[];
  contexts?: number[];
}

// Context menu command for messages
const contextMenuCommand: Command = {
  name: 'Convert to SyncFM',
  type: 3, // 3 = Message Context Menu
  integration_types: [0, 1], // 0 = Guild Install, 1 = User Install
  contexts: [0, 1, 2], // 0 = Guild, 1 = Bot DM, 2 = Group DM/Private Channel
};

const shareSlashCommand: Command = {
  name: 'share',
  description: 'Convert a music link to SyncFM and share it with the channel',
  type: 1, // 1 = Slash Command
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  options: [
    {
      type: 3, // 3 = String option
      name: 'url',
      description: 'Music link from Spotify, Apple Music, or YouTube Music',
      required: true,
    },
  ],
};

const commands: Command[] = [contextMenuCommand, shareSlashCommand];

async function registerCommands() {
  if (!DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!DISCORD_CLIENT_ID) {
    console.error('DISCORD_CLIENT_ID environment variable is required');
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`;

  try {
    console.log('Registering context menu command...');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to register command: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const result = await response.json() as any[];
    console.log('Successfully registered commands:');
    for (const cmd of result) {
      console.log(`- ${cmd.name} (ID: ${cmd.id})`);
      console.log(`  Type: ${cmd.type === 3 ? 'Message Context Menu' : cmd.type === 1 ? 'Slash Command' : 'Unknown'}`);
      console.log(`  Integration Types: ${cmd.integration_types || 'Not specified'}`);
      console.log(`  Contexts: ${cmd.contexts || 'Not specified'}`);
      if (Array.isArray(cmd.options) && cmd.options.length > 0) {
        console.log('  Options:');
        for (const option of cmd.options) {
          console.log(`    - ${option.name}: ${option.description}`);
        }
      }
    }
  } catch (error) {
    console.error('Error registering command:', error);
    process.exit(1);
  }
}

async function listCommands() {
  if (!DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!DISCORD_CLIENT_ID) {
    console.error('DISCORD_CLIENT_ID environment variable is required');
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`;

  try {
    console.log('Fetching registered commands...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch commands: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const commands = await response.json() as any[];

    if (commands.length === 0) {
      console.log('No commands registered yet');
    } else {
      console.log(`Found ${commands.length} registered command(s):\n`);
      commands.forEach((cmd: any) => {
        console.log(`- ${cmd.name} (ID: ${cmd.id})`);
        console.log(`Type: ${cmd.type === 3 ? 'Message Context Menu' : cmd.type === 2 ? 'User Context Menu' : 'Slash Command'}`);
        console.log(`Integration Types: ${cmd.integration_types || 'Not specified'}`);
        console.log(`Contexts: ${cmd.contexts || 'Not specified'}\n`);
      });
    }
  } catch (error) {
    console.error('Error fetching commands:', error);
    process.exit(1);
  }
}

async function clearCommands() {
  if (!DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!DISCORD_CLIENT_ID) {
    console.error('DISCORD_CLIENT_ID environment variable is required');
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`;

  try {
    console.log('Clearing all commands...');

    // Set commands to empty array to clear all
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify([]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to clear commands: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    console.log('Successfully cleared all commands');
  } catch (error) {
    console.error('Error clearing commands:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command_arg = args[0];

if (command_arg === 'list') {
  listCommands();
} else if (command_arg === 'clear' || command_arg === 'delete') {
  clearCommands();
} else if (command_arg === 'register' || !command_arg) {
  registerCommands();
} else {
  console.log('Usage: bun src/register-commands.ts [register|list|clear]\n');
  console.log('register - Register the context menu command (default)');
  console.log('list - List all registered commands');
  console.log('clear - Clear/delete all registered commands');
  process.exit(1);
}
