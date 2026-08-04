import mongoose from "mongoose";

export const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);
