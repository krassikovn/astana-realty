// Чешский словарь: ключ — русская строка из кода, значение — перевод. Словари разбиты по разделам сайта.
import core from './cs.core.js'
import shell from './cs.shell.js'
import pages from './cs.pages.js'
import rent from './cs.rent.js'
import start from './cs.start.js'
export default { ...core, ...shell, ...pages, ...rent, ...start }
