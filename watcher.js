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
    if (event.filename.endsWith('.js')) {
        childProcess.kill('SIGKILL')
        childProcess = spawnNode()
    }
}