import { Schema, SchemaDefinition, SchemaOptions } from 'mongoose';

const baseDefinition = {
    isDeleted: { type: Boolean, required: true, default: false },
    createAt: { type: Date, required: true, default: Date.now },
    updateAt: { type: Date, required: true, default: Date.now }
};

export const BaseSchema = (definition: SchemaDefinition, options?: SchemaOptions) => {
    const baseSchema = new Schema(
        {
            ...baseDefinition,
            ...definition
        },
        options
    );

    baseSchema.virtual('id').get(function() {
        return this._id;
    });

    return baseSchema;
};
