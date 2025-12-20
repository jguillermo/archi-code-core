import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'auth_user',
  timestamps: {
    createdAt: 'row_created_at',
    updatedAt: 'row_updated_at',
  },
})
export class UserDocument extends Document {
  @Prop()
  declare _id: string;

  @Prop()
  name: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ type: Object })
  roles: string;

  @Prop({ type: Object })
  authenticationDetails: string;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
