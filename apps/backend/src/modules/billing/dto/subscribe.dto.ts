import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export class SubscribeDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
