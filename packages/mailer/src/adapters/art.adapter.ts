import * as template from 'art-template';
import * as fs from 'fs';
import { TemplateAdapter } from '../mailer.interfaces';

export interface ArtTemplateDefaults {
    /**
     * template name
     */
    filename?: string;
    /**
     * an array of rules of template syntax
     */
    rules: any[];
    /**
     * whether to automatically encode output statements of template. Setting false will close that functionality
     * escape can prevent XSS attacks
     */
    excape: boolean;
    /**
     * enable debug mode. If true: {cache:false, minimize:false, compileDebug:true}
     */
    debug: boolean;
    /**
     * if bail is set true, compilation errors and runtime errors will throw exception
     */
    bail: boolean;
    /**
     * whether to enable caching
     */
    cache: boolean;
    /**
     * whether to enable minimization. It will execute htmlMinifier and minimize HTML, CSS, JS
     * if template contains unclosing tags, please don't open minimize. Otherwise unclosing tags will be restored or filtered
     */
    minimize: boolean;

    /**
     * whether to compile in debug mode
     */
    compileDebug: boolean;
    /**
     * resolve template path
     */
    resolveFilename: any;
    /**
     * sub template compilation adapter
     */
    include: any,

    /**
     *  HTML minifier. Work only in NodeJS environment
     */
    htmlMinifier: any;

    /**
     * HTML minifier configuration. Refer to: https://github.com/kangax/html-minifier
     */
    htmlMinifierOptions: {
        collapseWhitespace: boolean,
        minifyCSS: boolean,
        minifyJS: boolean,
        // automatically merged at runtime: rules.map(rule => rule.test)
        ignoreCustomFragments: any[]
    };

    /**
     * error events. Work only if bail is false
     */
    onerror: any,

    /**
     * template file loader
     */
    loader: any,

    /**
     * cache center adapter (depend on filename field)
     */
    caches: any,

    /**
     * root directory of template. If filename field is not a local path, template will be found in root directory
     * @default '/'
     */
    root: string;

    /**
     * @default '.art'
     * default extension. If no extensions, extname will be automatically added
     */
    extname: string,

    /**
     * ignored variables. An array of template variables ignored by template compiler
     */
    ignore: any[],

    // imported template variables
    imports: { [key: string]: Function }
}

export class ArtAdapter implements TemplateAdapter {
    private precompiledTemplates: { [name: string]: any } = {};

    constructor(options?: Partial<ArtTemplateDefaults>) {
        if (!!options) {
            Object.keys(options).forEach((key, value) => {
                template.defaults[key] = value;
            });
        }
    }

    public async compile(mail: any, callback: any) {
        try {
            const data = fs.readFileSync(mail.data.template, 'utf-8');
            this.precompiledTemplates[mail.data.template] = template.compile(data.toString());
        } catch (err) {
            callback(err);
        }

        mail.data.html = this.precompiledTemplates[mail.data.template](mail.data.context);

        return callback();
    }
}