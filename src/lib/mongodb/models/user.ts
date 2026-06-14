import mongoose, { Schema, type Model } from "mongoose";
export interface IMongoUser {
    _id: string;
    shopId: string;
    username: string;
    password: string;
    fullName: string;
    role: "ADMIN" | "CASHIER";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
const UserSchema = new Schema<IMongoUser>({
    _id: { type: String, required: true },
    shopId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "CASHIER"], required: true },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    _id: false,
});
UserSchema.index({ shopId: 1, username: 1 }, { unique: true });
export const MongoUser: Model<IMongoUser> = mongoose.models.BataUser ??
    mongoose.model<IMongoUser>("BataUser", UserSchema);

