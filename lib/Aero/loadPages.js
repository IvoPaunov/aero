module.exports = function*() {
	this.time('Pages')

	yield Promise.resolve()

	this.timeEnd('Pages')
}