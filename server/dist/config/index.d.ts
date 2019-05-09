declare let config: {
    port: string;
    hostName: string;
    static: {
        root: string;
        prefix: string;
        uploadPath: string;
    };
    jwt: {
        secretOrPrivateKey: string;
        signOptions: {
            expiresIn: number;
        };
    };
    orm: {
        type: string;
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        dropSchema: boolean;
        synchronize: boolean;
        logging: boolean;
        entities: string[];
    };
};
export { config };
export default config;
