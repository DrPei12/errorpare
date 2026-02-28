// ErrorPare - Command Executor (with graceful fallback)

import { EventEmitter } from 'events';
import type { ExecutionResult } from '../../types/index.js';

export interface CommandExecutorOptions {
  cwd?: string;
  env?: Record<string, string>;
  shell?: string;
  cols?: number;
  rows?: number;
}

/**
 * Try to load node-pty, fallback to null if not available
 */
let nodePty: any = null;
try {
  nodePty = require('node-pty');
} catch (e) {
  // node-pty not available, will use cross-spawn fallback
}

/**
 * Command Executor with graceful fallback
 * - Try node-pty first (best terminal experience)
 * - Fallback to cross-spawn (no compilation required)
 */
export class CommandExecutor extends EventEmitter {
  private ptyProcess: any = null;
  private stdout: string = '';
  private stderr: string = '';
  private exitCode: number = 0;
  private usePty: boolean = false;
  
  constructor(private options: CommandExecutorOptions = {}) {
    super();
    // Check if node-pty is available
    this.usePty = !!nodePty;
  }
  
  /**
   * Executes a command and returns the result
   */
  async execute(command: string): Promise<ExecutionResult> {
    if (this.usePty) {
      return this.executeWithPty(command);
    } else {
      return this.executeWithSpawn(command);
    }
  }
  
  /**
   * Execute with node-pty (best experience)
   */
  private async executeWithPty(command: string): Promise<ExecutionResult> {
    const { execSync } = await import('child_process');
    const os = await import('os');
    const cwd = this.options.cwd || process.cwd();
    const shell = this.options.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
    
    return new Promise((resolve, reject) => {
      try {
        this.ptyProcess = nodePty.spawn(shell, ['-c', command], {
          name: 'xterm-256color',
          cols: this.options.cols || 80,
          rows: this.options.rows || 30,
          cwd,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
            TERM: 'xterm-256color',
            ...this.options.env,
          },
        });
        
        this.ptyProcess.onData((data: string) => {
          this.stdout += data;
          this.emit('stdout', data);
        });
        
        this.ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
          this.exitCode = exitCode;
          resolve({
            stdout: this.stdout,
            stderr: this.stderr,
            exitCode,
          });
        });
        
      } catch (error) {
        // Fallback to spawn on error
        this.usePty = false;
        this.executeWithSpawn(command).then(resolve).catch(reject);
      }
    });
  }
  
  /**
   * Execute with cross-spawn (fallback, no native deps)
   */
  private async executeWithSpawn(command: string): Promise<ExecutionResult> {
    const { default: spawn } = await import('cross-spawn');
    const os = await import('os');
    const cwd = this.options.cwd || process.cwd();
    const shell = this.options.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
    
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      const child = spawn(shell, ['-c', command], {
        cwd,
        env: {
          ...process.env,
          FORCE_COLOR: '1',
          TERM: 'xterm-256color',
          ...this.options.env,
        },
      });
      
      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          const str = data.toString();
          stdout += str;
          this.emit('stdout', str);
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          const str = data.toString();
          stderr += str;
          this.emit('stderr', str);
        });
      }
      
      child.on('close', (code: number | null) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });
      
      child.on('error', (err: Error) => {
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  }
  
  /**
   * Kill the running process
   */
  kill(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
  
  /**
   * Check if using PTY
   */
  isUsingPty(): boolean {
    return this.usePty;
  }
}

/**
 * Simple command executor (basic fallback)
 */
export class SimpleCommandExecutor {
  async execute(command: string, cwd?: string): Promise<ExecutionResult> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
      });
      
      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }
}
