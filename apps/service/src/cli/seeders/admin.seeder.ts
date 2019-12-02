import { AdminModelName } from "../../bll/user";
import { Seeder } from "../../seeder/seeder.decorators";
import { ISeeder } from "../../seeder/seeder.interfaces";

@Seeder()
export class AdminSeeder implements ISeeder {

    public modelName: string = AdminModelName;
    public sort: number = 1;

    constructor() { }

    async seed() {
        console.log('seed admin');
        console.log('seed admin');
        console.log('seed admin');
        console.log('seed admin');
    }
}