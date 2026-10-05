console.log('yay!')

function genPassword(length, charsSet) {
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charsSet.length);
        password += charsSet[randomIndex];
    }
    return password;
}

COMMON_CHAR_SETS = {
    lowercaseEn: 'abcdefghijklmnopqrstuvwxyz',
    uppercaseEn: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lettersEn: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    simpleSymbols: '!@#$%^&*()_+-=',
    advancedSymbols: '[]{}|;:,.<>?\\/"\'`~',
}

NUMBERS_CHAR_SET = COMMON_CHAR_SETS.numbers
LETTERS_CHAR_SET = COMMON_CHAR_SETS.lettersEn
LETTERS_NUMBERS_CHAR_SET = LETTERS_CHAR_SET + NUMBERS_CHAR_SET
NORMAL_CHAR_SET = LETTERS_NUMBERS_CHAR_SET + COMMON_CHAR_SETS.simpleSymbols
ADVANCED_CHAR_SET = NORMAL_CHAR_SET + COMMON_CHAR_SETS.advancedSymbols

class CharSetBuilder {
    charSet = ''

    addSet(charSet) {
        this.charSet += charSet
        return this
    }

    addChar(char) {
        this.charSet += char
        return this
    }

    excludeChar(c) {
        this.charSet = this.charSet.replace(c, '')
        return this
    }

    excludeSet(charSet) {
        for (const c of charSet) {
            this.charSet = this.charSet.replace(c, '')
        }
        return this
    }

    get() {
        return this.charSet
    }
}

s = new CharSetBuilder().addSet(NORMAL_CHAR_SET).excludeChar('7').excludeSet('123!').addChar('!').get()
console.log(s)

const pass = genPassword(30, s)
console.log(pass)

document.getElementById('generate-button').addEventListener('click', () => {
    const length = parseInt(document.getElementById('length').value)
    const charSet = new CharSetBuilder()
        .addSet(NORMAL_CHAR_SET)
        .excludeChar('7')
        .excludeSet('123!')
    .addChar('!')
    const password = genPassword(length, charSet.get())
    document.getElementById('result').textContent = password
})

document.getElementById('copy-button').addEventListener('click', () => {
    const password = document.getElementById('result').textContent
    if (!password) return
    navigator.clipboard.writeText(password)
    const copyButton = document.getElementById('copy-button')
    copyButton.classList.add('copied')
    setTimeout(() => copyButton.classList.remove('copied'), 1000)
})