"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const console_service_1 = require("../console.service");
let Command = class Command {
    constructor(cli) {
        this.cli = cli;
        this.cli
            .getCli()
            .command('list <directory>')
            .description('List content of a directory')
            .action(this.list.bind(this));
        this.cli
            .getCli()
            .command('rm <dir>')
            .option('-r, --recursive', 'Remove recursively')
            .action(this.list.bind(this));
    }
    async list(directory) {
        const sp = console_service_1.ConsoleService.createSpinner();
        sp.start(`Listing files in directory ${directory}`);
        setTimeout(() => {
            sp.stop();
        }, 2000);
    }
    async rm(dir, cmdObj) {
        console.log('remove ' + dir + (cmdObj.recursive ? ' recursively' : ''));
    }
};
Command = __decorate([
    common_1.Injectable(),
    __metadata("design:paramtypes", [console_service_1.ConsoleService])
], Command);
exports.Command = Command;
//# sourceMappingURL=command.js.map