// 4-way BSA + FIFO

let cache = null
let isInitialized = false

let cache_blocks = 16
let mem_blocks = 0
let block_size = 32

let mem_seq = null
let step_ctr = 0
let hit_count = 0
let miss_count = 0
let error_container = null

const cache_acc_time = 1
const mem_acc_time = 10

document.addEventListener('DOMContentLoaded', e => {
    error_container = document.getElementById('error')
    const runBtn = document.getElementById('full-run')
    runBtn.addEventListener('click', e => {
        error_container.innerHTML = ''
        initialize()
        step()
        cache = null
        isInitialized = false
    })

    const stepBtn = document.getElementById('step')
        stepBtn.addEventListener('click', e => {
        error_container.innerHTML = ''
        if (!isInitialized)
            initialize()
        step(false)
    })

    const resetBtn = document.getElementById('reset')
    resetBtn.addEventListener('click', e => {
        error_container.innerHTML = ''
        isInitialized = false
        document.getElementById('snapshot').innerHTML = ''
        document.getElementById('seq-table').innerHTML = ''
        cache = null
        step_ctr = 0
    })

    const textarea = document.getElementById('mem-seq');

    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight > this.clientHeight ? this.scrollHeight : this.clientHeight) + 'px';
    });

    document.getElementById('test-a').addEventListener('click', e => {
        document.getElementById('mem-seq').value = generateTestCases('a')
        initialize()
        textarea.dispatchEvent(new Event('input'))
    })
    document.getElementById('test-b').addEventListener('click', e => {
        mem_blocks = parseInt(document.getElementById('mm-size').value)
        document.getElementById('mem-seq').value = generateTestCases('b')
        initialize()
        textarea.dispatchEvent(new Event('input'))
    })
    document.getElementById('test-c').addEventListener('click', e => {
        document.getElementById('mem-seq').value = generateTestCases('c')
        initialize()
        textarea.dispatchEvent(new Event('input'))
    })
})

function step(skip = true) {
    error_container.innerHTML = ''
    if (Math.max(...mem_seq) < mem_blocks) {
        if (!skip) {
            // go thru mem seq 1 by 1
            cache.find(mem_seq[step_ctr])
            step_ctr++
        } else {
            // go thru each in mem seq
            mem_seq.forEach(addr => {
                cache.find(addr)
                step_ctr++
            })
        }
    } else {
        if (isNaN(mem_blocks)) {
            error_container.innerHTML = 'Please input Main Memory Size'
        } else {
            error_container.innerHTML = 'Main Memory Size too small'
        }
    }
    updateOutputs()
}

function initialize() {
    step_ctr = 0
    hit_count = 0
    miss_count = 0
    mem_seq = parseCSV(document.getElementById('mem-seq').value)
    block_size = parseInt(document.getElementById('block-size').value)
    const set_size = parseInt(document.getElementById('set-size').value)
    mem_blocks = parseInt(document.getElementById('mm-size').value)
    cache_blocks = parseInt(document.getElementById('cm-size').value)
    document.getElementById('snapshot').innerHTML = '<tr><td class=\'px-2\'>Set</td><td class=\'px-2\'>Block</td><td class=\'px-2\'>Stored</td><td class=\'px-2\'>Time</td></tr>'
    document.getElementById('seq-table').innerHTML = ''

    cache = new Cache(cache_blocks, set_size)

    createSequenceUI()

    isInitialized = true
}

function parseCSV(csv) {
    return csv.split(',')
            .map(value => parseInt(value.trim(), 10))
            .filter(value => !isNaN(value))
}

function createSequenceUI() {
    const read_seq = document.getElementById('seq-table')
    let html = ''
    html += `<tr>\n<td class='px-2'>Access</td>\n<td class='px-2'>Hit</td>\n<td class='px-2'>Miss</td></tr>`
    for (let i = 0; i < mem_seq.length; i++) {
        html += `<tr>\n<td class='border-black border px-2'>${mem_seq[i]}</td>\n<td id='${i}-hit'class='border-black border px-2'></td>\n<td id='${i}-miss'class='border-black border px-2'></td></tr>`
    }
    read_seq.innerHTML += html
}

function generateTestCases(key = 'a') {
    let seq = ''
    switch (key) {
        case 'a':
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 2 * cache_blocks; j++)
                    seq += j.toString() + ', '
            break;
        case 'b':
            if (mem_blocks === 0 || isNaN(mem_blocks)) {
                error_container.innerHTML = 'Please set Main Memory Size before using Test Case B'
            } else {
                for (let i = 0; i < 4 * cache_blocks; i++) {
                    seq += Math.floor(Math.random() * mem_blocks) + ', '
                }
            }
            break;
        case 'c':
            for (let i = 0; i < 4; i++) {
                seq += 0 + ', '

                for (let j = 0; j < 2; j++)
                    for (let k = 1; k < cache_blocks - 1; k++)
                        seq += k + ', '
                for (let j = cache_blocks - 1; j < 2 * cache_blocks; j++)
                    seq += j + ', '
            }
            break;
    }
    return seq.slice(0, -2)
}

function updateOutputs() {
    const total = hit_count + miss_count
    document.getElementById('memory-access-count').innerHTML = total
    document.getElementById('cache-hit-count').innerHTML = hit_count
    document.getElementById('cache-miss-count').innerHTML = miss_count
    document.getElementById('cache-hit-rate').innerHTML = (hit_count / total * 100).toFixed(2) + '%'
    document.getElementById('cache-miss-rate').innerHTML = (miss_count / total * 100).toFixed(2) + '%'
    document.getElementById('average-memory-access-time').innerHTML = computeAverageTime().toFixed(2) + ' ns'
    document.getElementById('total-memory-access-time').innerHTML = computeTotalTime().toFixed(2) + ' ns'
}

function computeAverageTime() {
    const total = hit_count + miss_count
    return hit_count / total * cache_acc_time + miss_count / total * (cache_acc_time + block_size * mem_acc_time)
}

function computeTotalTime() {
    return hit_count * block_size * cache_acc_time + miss_count * (cache_acc_time + block_size * mem_acc_time)
}

class Cache {
    constructor(size, set_size) {
        this.size = size
        this.sets = []
        for (let i = 0; i < size / set_size; i++) {
            this.sets[i] = new Set(i, set_size)
            this.sets[i].createElements()
        }

        for (let i = 0; i < this.sets.length; i++)
            this.sets[i].assignElements()
    }

    find(addr) {
        this.sets[addr % this.sets.length].map(addr)
    }
}

// Heavy lifting here
class Set {

    constructor(set_no, size) {
        this.set_no = set_no
        this.size = size
        this.blocks = []
        this.next_dequeue = 0
        this.outputs = []
        this.t = []
    }

    map(address) {
        let are_you_there = false

        // Are you there?
        this.blocks.forEach(block => {
            if (block == address) {
                are_you_there = true
                return
            }
        })


        if (!are_you_there) {
            // Cache not yet full
            if (this.blocks.length < this.size) {
                this.blocks.push(address)
                this.outputs[this.blocks.length - 1].innerHTML = address
                this.t[this.blocks.length - 1].innerHTML = `${this.blocks.length}`

                this.outputs[this.blocks.length - 1].style.background = '#cbf3a4'
                this.t[this.blocks.length - 1].style.background = '#cbf3a4'
                if (this.blocks.length > 1) {
                    this.outputs[this.blocks.length - 2].style.background = null
                    this.t[this.blocks.length - 2].style.background = null
                }

            // Cache full
            } else {
                this.blocks[this.next_dequeue % this.size] = address
                this.outputs[this.next_dequeue % this.size].innerHTML = address
                this.t[this.next_dequeue % this.size].innerHTML = `${this.next_dequeue + 1}`

                this.outputs[this.next_dequeue % this.size].style.background = '#cbf3a4'
                this.outputs[(this.next_dequeue - 1) % this.size].style.background = null
                this.t[this.next_dequeue % this.size].style.background = '#cbf3a4'
                this.t[(this.next_dequeue - 1) % this.size].style.background = null
            }
            this.next_dequeue++
            document.getElementById(`${step_ctr}-miss`).innerHTML = 'X'
            miss_count++
        } else {
            document.getElementById(`${step_ctr}-hit`).innerHTML = 'X'
            hit_count++
        }
    }

    createElements() {
        const snapshot = document.getElementById('snapshot')
        let html = ''
        for (let i = 0; i < this.size; i++) {
            html += '<tr>\n'
            if (i == 0) {
                html += `<td class="border-black border px-2" rowspan="${this.size}">${this.set_no}</td>\n`
            }
            html += `<td class="border-black border px-2">${i}:&nbsp;</td>\n`
            html += `<td class="border-black border px-2" id="${this.set_no}-${i}">\0</td>\n`
            html += `<td class="border-black border px-2" id="t${this.set_no}-${i}">\0</td>\n`
            html += '</tr>\n'
        }
        snapshot.innerHTML += html
    }

    assignElements() {
        for (let i = 0; i < this.size; i++) {
            this.outputs[i] = document.getElementById(`${this.set_no}-${i}`)
            this.t[i] = document.getElementById(`t${this.set_no}-${i}`)
        }
    }
}