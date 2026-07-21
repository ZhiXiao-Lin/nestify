describe('@a3s-lab/ai entry point', () => {
    it('does not synchronously load the native @a3s-lab/code addon', () => {
        jest.isolateModules(() => {
            jest.doMock('@a3s-lab/code', () => {
                throw new Error('native addon was loaded synchronously');
            });

            expect(() => require('../index')).not.toThrow();
        });
    });
});
