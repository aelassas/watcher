## Table of Contents

1.  [Introduction](#introduction)
2.  [Setting up the Project](#set-up)
3.  [Server](#server)
4.  [Watcher](#watcher)
5.  [Bringing the Pieces Together](#bringing-pieces-together)
6.  [References](#references)

## <a id="introduction" name="introduction">Introduction</a>

When working on Node.js applications, you often need to restart your server after some changes. Well, this would be annoying if you have to manually restart your server each time you do some modifications in your source code. Thankfully, there are some utilities available that let you automatically restart your server when changes are detected. And the most famous one is nodemon. nodemon is a tool that helps develop Node.js based applications by automatically restarting the node application when file changes in the directory are detected. The purpose of this tip is not to reinvent the wheel, but to show you how you can create your own utility that monitors for any changes in your Node.js application and automatically restart the server in just a few lines of code.

## <a id="set-up" name="set-up">Setting up the Project</a>

The first step will be to initialize our Node.js project:

```bash
npm init
```

Then, we will have to update _package.json_ in order to add support of ES6 by setting `module` as `type`:

```js
{
  "name": "watcher",
  "type": "module",
  "version": "1.0.0",
  "author": "Akram El Assas"
}
```

Then, we will install development dependencies:

```bash
npm i -D @types/node
```

*   `@types/node`: To have autocomplete in Visual Studio Code

## Server<a id="server" name="server"></a>

We will create a simple web server _server.js_ as follows:

```js
import { createServer } from 'http'

const PORT = 8888

createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.write('Hello World!')
    res.end()
}).listen(PORT)

console.log('HTTP server is running on Port', PORT)
```

Then, we will create a watcher in order to restart the server each time changes are detected on the parent folder of the server and in its subfolders through the following command:

```bash
node watcher.js server.js
```

## Watcher<a id="watcher" name="watcher"></a>

The watcher will restart the server each time changes are detected.

First and foremost, we'll need to retrieve the command-line arguments. In Node.js, we can have access to command-line arguments through `process.argv`. The `process.argv` property returns an array containing the command-line arguments passed when the Node.js process was launched. The first element will be `execPath`. The second element will be the path to the JavaScript file being executed. The remaining elements will be any additional command-line arguments.

If we run the following command:

```bash
node watcher.js server.js
```

`process.argv` will be as follows:

```js
[
  'C:\\Program Files\\nodejs\\node.exe',
  'C:\\dev\\watcher\\src\\watcher.js',
  'server.js'
]
```

The first element is the path to Node.js executable. The second element is the path to _watcher.js_. And the last element is _server.js_. Thus, we can start our code by declaring the first and third elements as follows:

```js
const [node, _, file] = process.argv
```

We then need to create a function that starts a child process that launches Node.js with the specified file as argument which in our case is _server.js_. To do so, we will use `spawn` method from `child_process` module. The `child_process.spawn()` method spawns a new process using the given command, with command-line arguments in args. The advantages of using `spawn` method is that we can redirect `stdout` and `stderr` of the child process to the parent process using `pipe` method. `pipe` method is used to attach a writable stream to a readable stream so that it consequently switches into flowing mode and then pushes all the data that it has to the attached writable stream. The source code of our function will look like follows:

```js
import { spawn } from 'child_process'

const [node, _, file] = process.argv

const spawnNode = () => {
    const childProcess = spawn(node, [file])
    childProcess.stdout.pipe(process.stdout)
    childProcess.stderr.pipe(process.stderr)

    childProcess.on('close', (code) => {
        if (code !== null) {
            process.exit(code)
        }
    })

    return childProcess
}
```

First of all, we spawn a child Node.js process with the given file argument. Then, we redirect `stdout` and `stderr` of the child process to the parent process using `pipe` method. Then, when the child process is closed, we exit the parent process with the same exit code. The `process.exit()` method instructs Node.js to terminate the process synchronously with an exit status of code. If code is omitted, `exit` uses either the success code 0 or the value of `process.exitCode` if it has been set. Node.js will not terminate until all the `exit` event listeners are called. And finally, we return the child process.

Now, we need to detect changes on the parent folder of the file and its subfolders. And each time a change related to a JavaScript file is detected, we will kill the child process and spawn the child process again. To do so, we will use `watch` method from `fs/promises` module. The `fs/promises.watch()` method returns an async iterator that watches for changes on filename, where filename is either a file or a directory. We will create a watcher on the parent folder of the file. Then, we will iterate through watcher. We will ignore _node_modules_ folder and each time a change is detected on a JavaScript file, we will kill the child process and spawn it again as follows:

```js
let childProcess = spawnNode()
const watcher = watch(dirname(file), { recursive: true })
for await (const event of watcher) {
    if (
        !event.filename.includes('node_modules') &&
        event.filename.endsWith('.js')
    ) {
        childProcess.kill('SIGKILL')
        childProcess = spawnNode()
    }
}
```

The `subprocess.kill()` method sends a signal to the child process. If no argument is given, the process will be sent the `SIGTERM` signal. `SIGKILL` signal cannot be caught, blocked, or ignored and forces the child process to stop. See [signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html) for a list of available signals.

That's it! We have finished our own nodemon in just a few lines of code.

Last but not least, we need to add the `start` and `dev` scripts to our _package.json_ as follows:

```js
{
  "name": "watcher",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node watcher.js server.js"
  },
  "author": "Akram El Assas",
  "devDependencies": {
    "@types/node": "^18.11.17"
  }
}
```

In order to start our application, just type the following command:

```bash
npm run dev
```

Now if we run our application and make changes to _server.js_, the server will be restarted automatically. We no longer need to stop and start the server manually.

## Bringing the Pieces Together<a id="bringing-pieces-together" name="bringing-pieces-together"></a>

We set up our own nodemon in just a few lines of code. Now, The whole source code of our _watcher.js_ looks like follows:

```js
import { spawn } from 'child_process'
import { watch } from 'fs/promises'
import { dirname } from 'path'

const [node, _, file] = process.argv

const spawnNode = () => {
    const childProcess = spawn(node, [file])
    childProcess.stdout.pipe(process.stdout)
    childProcess.stderr.pipe(process.stderr)

    childProcess.on('close', (code) => {
        if (code !== null) {
            process.exit(code)
        }
    })

    return childProcess
}

let childProcess = spawnNode()
const watcher = watch(dirname(file), { recursive: true })
for await (const event of watcher) {
    if (
        !event.filename.includes('node_modules') &&
        event.filename.endsWith('.js')
    ) {
        childProcess.kill('SIGKILL')
        childProcess = spawnNode()
    }
}
```

This is just a simple example but you can imagine other situations where you monitor changes on video files and each time a change is detected, a conversion child process (`ffmpeg`) is launched.

You can also implement other options such as:

*   Ignoring specific files or directories
*   Watching specific directories
*   Monitoring multiple directories
*   Specifying extension watch list
*   Delaying restarting
*   Running executables other than Node.js such as Python, Ruby, make, etc.
*   and so on...

## References<a id="references" name="references"></a>

*   [nodemon](https://github.com/remy/nodemon)
*   [child_process.spawn(command[, args][, options])](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options)
*   [process.exit([code])](https://nodejs.org/api/process.html#processexitcode)
*   [fsPromises.watch(filename[, options])](https://nodejs.org/api/fs.html#fspromiseswatchfilename-options)
*   [process.kill(pid[, signal])](https://nodejs.org/api/process.html#processkillpid-signal)
*   [signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)
