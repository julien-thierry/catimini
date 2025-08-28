import * as fs from 'fs';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// keep track of the `tauri-driver` child process
let tauriDriver;
let exit = false;

const tauriDriverPath = path.resolve(__dirname, ".cargo", "bin", "tauri-driver");

export const config = {
    host: '127.0.0.1',
    port: 4444,
    specs: ['./tests/*.test.ts'],
    maxInstances: 1,
    capabilities: [
    {
        maxInstances: 1,
        'tauri:options': {
            application: '../target/release/catimini-run',
        },
    },
    ],
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    // ensure the rust project is built since we expect this binary to exist for the webdriver sessions
    onPrepare: () => {
        spawnSync('npm', ['run', '--prefix', 'catimini-ui', 'tauri', 'build', '--debug', '--no-bundle'], {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            shell: true,
        });
    },

      // ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
    beforeSession: () => {
        if (!fs.existsSync(tauriDriverPath)) {
            spawnSync(
                "cargo",
                ["install", "--root", path.resolve(__dirname, ".cargo"), "tauri-driver"],
                { stdio: [null, process.stdout, process.stderr] }
            );
        }

        tauriDriver = spawn(
            tauriDriverPath,
            [],
            { stdio: [null, process.stdout, process.stderr] }
        );

        tauriDriver.on('error', (error) => {
            console.error('tauri-driver error:', error);
            process.exit(1);
        });
        tauriDriver.on('exit', (code) => {
            if (!exit) {
                console.error('tauri-driver exited with code:', code);
                process.exit(1);
            }
        });
    },

    // clean up the `tauri-driver` process we spawned at the start of the session
    // note that afterSession might not run if the session fails to start, so we also run the cleanup on shutdown
    afterSession: () => {
        closeTauriDriver();
    },
};

function closeTauriDriver() {
    exit = true;
    tauriDriver?.kill();
}

function onShutdown(fn) {
    const cleanup = () => {
        try {
            fn();
        } finally {
            process.exit();
        }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
    process.on('SIGBREAK', cleanup);
}

// ensure tauri-driver is closed when our test process exits
onShutdown(() => {
    closeTauriDriver();
});
