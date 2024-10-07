import init, { decimal_to_binary, binary_to_decimal, binary_to_decimal_ext, get_predefined_layout, PredefinedLayout } from './ieee754_web.js';

await init();

const DECIMAL_PRECISION = 20

const DEFALT_LAYOUT = get_predefined_layout(PredefinedLayout.Float32)
let current_layout = DEFALT_LAYOUT

const decInputField = document.getElementById('dec-input-field')

const copyDecButton = document.getElementById('button-copy-dec')
const copyBinButton = document.getElementById('button-copy-bin')
const copyHexButton = document.getElementById('button-copy-hex')

const zeroButton = document.getElementById('button-zero')
const infButton = document.getElementById('button-inf')
const nanButton = document.getElementById('button-nan')

const signCheckboxesRow = document.getElementById('sign-checkboxes-row')
const exponentCheckboxesRow = document.getElementById('exponent-checkboxes-row')
const mantissaCheckboxesRow = document.getElementById('mantissa-checkboxes-row')

const binFieldsRow = document.getElementById('bin-fields-row')
const hexFieldsRow = document.getElementById('hex-fields-row')

const signBitText = document.getElementById('sign-bit-text')
const exponentBitsText = document.getElementById('exponent-bits-text')
const mantissaBitsText = document.getElementById('mantissa-bits-text')

const normalizedLabel = document.getElementById('normalized-section')

const layoutCombo = document.getElementById('layout-combo')

layoutCombo.onchange = () => {
    ChangeLayout(get_predefined_layout(PredefinedLayout[layoutCombo.value]))
    SetThree()
}

function ChangeLayout(layout) {
    current_layout = layout

    // sign bit
    {
        let checkboxes = []

        const N = layout.get_sign_size()

        for(let i = 0; i < N; ++i) {
            var checkbox = document.createElement("input")

            checkbox.type = 'checkbox'
            checkbox.id = 'sign-bit-' + N - 1 - i
            checkbox.classList.add('sign-bit')

            checkbox.onclick = () => {
                SetDataFromCheckboxes()
            }

            checkboxes.push(checkbox)
        }

        signCheckboxesRow.replaceChildren(...checkboxes)
    }

    // exponent bits
    {
        let checkboxes = []

        const N = layout.get_exponent_size()

        for(let i = 0; i < N; ++i) {
            var checkbox = document.createElement("input")

            checkbox.type = 'checkbox'
            checkbox.id = 'exponent-bit-' + N - 1 - i
            checkbox.classList.add('exponent-bit')

            checkbox.onclick = () => {
                SetDataFromCheckboxes()
            }

            checkboxes.push(checkbox)
        }

        exponentCheckboxesRow.replaceChildren(...checkboxes)
    }

    // mantissa bits
    {
        let checkboxes = []

        const N = layout.get_mantissa_size()

        for(let i = 0; i < N; ++i) {
            var checkbox = document.createElement("input")

            checkbox.type = 'checkbox'
            checkbox.id = 'mantissa-bit-' + N - 1 - i
            checkbox.classList.add('mantissa-bit')

            checkbox.onclick = () => {
                SetDataFromCheckboxes()
            }

            checkboxes.push(checkbox)
        }

        mantissaCheckboxesRow.replaceChildren(...checkboxes)
    }

    // bin input fields
    {
        let fields = []

        const N = layout.get_size() / 4

        for(let i = 0; i < N; ++i) {
            var field = document.createElement("input")

            field.type = 'text'
            field.id = 'bin-input-field-' + N
            field.classList.add('bin-input-field')

            // bin edit
            field.oninput = () => {
                let filtered = ''
                for(let i = 0; i < 4; ++i) {
                    const c = field.value[i]
                    if (c >= '0' && c <= '1') {
                        filtered += c
                    }
                }
            
                field.value = filtered
            }

            // bin submit
            field.onchange = () => {
                if (field.value.length < 4) {
                    field.value = '0'.repeat(4 - field.value.length) + field.value
                }
                SetDataFromBin()
            }

            fields.push(field)
        }

        binFieldsRow.replaceChildren(...fields)
    }

    // hex input fields
    {
        let fields = []

        const N = layout.get_size() / 16

        for(let i = 0; i < N; ++i) {
            var field = document.createElement("input")

            field.type = 'text'
            field.id = 'hex-input-field-' + N
            field.classList.add('hex-input-field')

            // hex edit
            field.oninput = () => {
                let filtered = ''
                for(let i = 0; i<4; ++i) {
                    const c = field.value[i]
                    if (c >= '0' && c <= '9') {
                        filtered += c
                    } else if (c >= 'A' && c <= 'F') {
                        filtered += c
                    } else if (c >= 'a' && c <= 'f') {
                        filtered += c
                    }
                }

                field.value = filtered
            }

            // hex submit
            field.onchange = () => {
                if (field.value.length < 4) {
                    field.value = '0'.repeat(4 - field.value.length) + field.value
                }
                field.value = field.value.toUpperCase()
                SetDataFromHex()
            }

            fields.push(field)
        }

        hexFieldsRow.replaceChildren(...fields)
    }
}

// dec edit
decInputField.oninput = () => {
    let filtered = ''
    for(let c of decInputField.value) {
        if (c >= '0' && c <= '9') {
            filtered += c
        } else if (c == '.' || c == ',' || c == '-') {
            filtered += c
        }
    }

    decInputField.value = filtered
}

// dec submit
decInputField.onchange = () => {
    if (!decInputField.value.includes('NaN') && !decInputField.value.includes('Infinity')) {
        if (decInputField.value.length == 0) {
            decInputField.value = "0"
        }
        if(decInputField.value.includes(',')) {
            decInputField.value.replace(',', '.')
        }
        if (!decInputField.value.includes('.')) {
            decInputField.value += '.0'
        }
    }
    SetDataFromDec()
}

copyDecButton.onclick = () => {
    navigator.clipboard.writeText(decInputField.value)
}

copyBinButton.onclick = () => {
    navigator.clipboard.writeText(GetBitsFromBin())
}

copyHexButton.onclick = () => {
    navigator.clipboard.writeText(hexInputFields[0].value + hexInputFields[1].value)
}

zeroButton.onclick = () => {
    SetZero()
}

infButton.onclick = () => {
    SetInf()
}

nanButton.onclick = () => {
    SetNan()
}

function GetBitsFromCheckboxes() {
    let bits = ''

    for (let div of [signCheckboxesRow, exponentCheckboxesRow, mantissaCheckboxesRow]) {
        for(let bit of Array.from(div.children)) {
            bits += bit.checked ? '1' : '0'
        }
    }

    return bits
}

function SetBitsToCheckboxes(bits) {
    let offset = 0

    for (let div of [signCheckboxesRow, exponentCheckboxesRow, mantissaCheckboxesRow]) {
        let checkboxes = Array.from(div.children)

        for(let i = 0; i<checkboxes.length; ++i) {
            let checkbox = checkboxes[i]
            checkbox.checked = bits[offset] == '1'
            ++offset
        }
    }
}

function SetBitsToLabels(bits) {
    const info = binary_to_decimal_ext(bits, current_layout, DECIMAL_PRECISION)
    signBitText.innerHTML = info.is_positive ? '+' : '-'

    if (info.are_exponent_and_mantissa_valid) {
        exponentBitsText.innerHTML = '2<sup>' + info.exponent + '</sup>'
        mantissaBitsText.innerHTML = info.mantissa
    } else {
        exponentBitsText.innerHTML = ''
        mantissaBitsText.innerHTML = ''
    }
    
    normalizedLabel.innerHTML = '<i>' + (info.is_denormalized ? 'denormalized' : 'normalized') + '</i>'
}

function GetBitsFromBin() {
    let bits = ''

    for (const binInputField of Array.from(binFieldsRow.children)) {
        bits += binInputField.value
    }
    
    return bits
}

function SetBitsToBin(bits) {
    let fields = Array.from(binFieldsRow.children)

    for (let i = 0; i < fields.length; ++i) {
        fields[i].value = bits.slice(i*4, i*4 + 4)
    }
}

function GetBitsFromHex() {
    let hex = ''

    for (const hexInputField of Array.from(hexFieldsRow.children)) {
        hex += hexInputField.value
    }

    return hex2bin(hex)
}

function SetBitsToHex(bits) {
    let hex = bin2hex(bits)

    let fields = Array.from(hexFieldsRow.children)

    for (let i = 0; i < fields.length; ++i) {
        fields[i].value = hex.slice(i*4, i*4 + 4).toUpperCase()
    }
}

function GetBitsFromDec() {
    return decimal_to_binary(decInputField.value, current_layout)
}

function SetBitsToDec(bits) {
    let val = binary_to_decimal(bits, current_layout, DECIMAL_PRECISION)
    if (!val.includes('NaN') && !val.includes('Infinity')) {
        if (!val.includes('.') && !val.includes(',')) {
            val += '.0'
        }
    }
    decInputField.value = val
}

function hex2bin(hex) {
    return (parseInt(hex, 16).toString(2)).padStart(current_layout.get_size(), '0');
}

function bin2hex(bin) {
    return (parseInt(bin, 2).toString(16)).padStart(current_layout.get_size() / 4, '0');
}

function SetData(bits, setFunctionsList) {
    for(const f of setFunctionsList) {
        f(bits)
    }
}

function SetAllData(bits) {
    SetData(bits, [
        SetBitsToDec,
        SetBitsToBin,
        SetBitsToHex,
        SetBitsToCheckboxes,
        SetBitsToLabels
    ])
}

function SetDataFromCheckboxes() {
    SetData(GetBitsFromCheckboxes(), [
        SetBitsToDec,
        SetBitsToHex,
        SetBitsToBin,
        SetBitsToLabels
    ])
}

function SetDataFromDec() {
    SetData(GetBitsFromDec(), [
        SetBitsToHex,
        SetBitsToBin,
        SetBitsToCheckboxes,
        SetBitsToLabels
    ])
}

function SetDataFromBin() {
    SetData(GetBitsFromBin(), [
        SetBitsToDec,
        SetBitsToHex,
        SetBitsToCheckboxes,
        SetBitsToLabels
    ])
}

function SetDataFromHex() {
    SetData(GetBitsFromHex(), [
        SetBitsToDec,
        SetBitsToBin,
        SetBitsToCheckboxes,
        SetBitsToLabels
    ])
}

function SetZero() {
    let bin = '0'.repeat(current_layout.get_size())
    SetAllData(bin)
}

function SetInf() {
    let bin = '0'.repeat(current_layout.get_sign_size()) + '1'.repeat(current_layout.get_exponent_size()) + '0'.repeat(current_layout.get_mantissa_size())
    SetAllData(bin)
}

function SetNan() {
    let bin = '0'.repeat(current_layout.get_sign_size()) + '1'.repeat(current_layout.get_exponent_size() + 1) + '0'.repeat(current_layout.get_mantissa_size() - 1)
    SetAllData(bin)
}

function SetOne() {
    let bin = '0'.repeat(current_layout.get_sign_size() + 1) + '1'.repeat(current_layout.get_exponent_size() - 1) + '0'.repeat(current_layout.get_mantissa_size())
    SetAllData(bin)
}

function SetTwo() {
    let bin = '0'.repeat(current_layout.get_sign_size()) + '1' + '0'.repeat(current_layout.get_exponent_size() - 1) + '0'.repeat(current_layout.get_mantissa_size())
    SetAllData(bin)
}

function SetThree() {
    let bin = '0'.repeat(current_layout.get_sign_size()) + '1' + '0'.repeat(current_layout.get_exponent_size() - 1) + '1' + '0'.repeat(current_layout.get_mantissa_size() - 1)
    SetAllData(bin)
}

ChangeLayout(DEFALT_LAYOUT)
SetThree()
