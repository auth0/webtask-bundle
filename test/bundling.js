'use strict';


const Bundler = require('../');
const Code = require('code');
const Lab = require('lab');
const Path = require('path');

const lab = exports.lab = Lab.script();
const expect = Code.expect;


lab.experiment('Webtask bundling', () => {
    lab.test('will succeed for a simple webtask', { timeout: 10000 }, done => {
        const bundle$ = Bundler.bundle({
            entry: Path.resolve(__dirname, './fixtures/webtask-with-simple-dep/index.js'),
        });

        return bundle$
            .subscribe(output => {
                expect(output).to.be.an.object();
                expect(output.code).to.be.a.string();
                expect(output.generation).to.equal(1);
                expect(output.stats).to.be.an.object();
                expect(output.stats.errors).to.be.an.array();
                expect(output.stats.errors.length).to.equal(0);
            }, done, done);
    });

    lab.test('will succeed with core-js elements', { timeout: 10000 }, done => {
        const bundle$ = Bundler.bundle({
            entry: Path.resolve(__dirname, './fixtures/webtask-with-core-js/index.js'),
        });

        return bundle$
            .subscribe(output => {
                expect(output).to.be.an.object();
                expect(output.code).to.be.a.string();
                expect(output.generation).to.equal(1);
                expect(output.stats).to.be.an.object();
                expect(output.stats.errors).to.be.an.array();
                expect(output.stats.errors.length).to.equal(0);
            }, done, done);
    });
});

if (require.main === module) {
    Lab.report([lab], { output: process.stdout, progress: 2 });
}
