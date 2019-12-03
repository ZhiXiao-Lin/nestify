import { Test, TestingModule } from '@nestjs/testing';
import { Command } from 'commander';
import { ConsoleModule } from './console.module';
import { ConsoleService } from './console.service';

describe('Console Module', () => {
    let module: TestingModule;
    let service: ConsoleService;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [ConsoleModule]
        }).compile();

        service = module.get(ConsoleService);
    });

    it('Should have a cli defined', () => {
        const cli = service.getCli();

        expect(cli).toBeDefined();
        expect(cli).toBeInstanceOf(Command);
    });

    it('Should create an ora spinner', async () => {
        const spinner = ConsoleService.createSpinner('hello');

        expect(spinner).toBeDefined();
    });

    it('Should display the help of a command', () => {
        const cli = service.getCli();

        const mockCommand = jest.fn();
        cli.command('world')
            .description('Test the cli')
            .action(mockCommand);

        // create mock on console.error, because commander will continue if the process.exit is mocked.
        const mockLogError = jest.spyOn(console, 'error').mockImplementation();
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        const mockLog = jest.spyOn(process.stdout, 'write').mockImplementation();

        service.init([process.argv0, 'console', '--help']);
        expect(mockLog).toHaveBeenCalledTimes(1);
        expect(mockLog.mock.calls[0][0]).toContain('Usage:');
        expect(mockLog.mock.calls[0][0]).toContain('world');
        expect(mockExit).toHaveBeenCalled();

        mockExit.mockRestore();
        mockLog.mockRestore();
        mockLogError.mockRestore();
    });
});
