/**
 * Script to register Discord context menu commands
 * Run this once to set up the "Convert to SyncFM" command
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';

interface Command {
  name: string;
  type: number;
  integration_types?: number[];
  contexts?: number[];
}

// Context menu command for messages
const command: Command = {
  name: 'Convert to SyncFM',
  type: 3, // 3 = Message Context Menu
  integration_types: [0, 1], // 0 = Guild Install, 1 = User Install
  contexts: [0, 1, 2], // 0 = Guild, 1 = Bot DM, 2 = Group DM/Private Channel
};

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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to register command: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const result = await response.json() as any;
    console.log('Successfully registered command:', result.name);
    console.log('Command ID:', result.id);
    console.log('Command Type:', result.type === 3 ? 'Message Context Menu' : 'Unknown');
    console.log('Integration Types:', result.integration_types || 'Not specified');
    console.log('Contexts:', result.contexts || 'Not specified');
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
