// activities.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './activities.schema';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) { }

  async createActivity(activityData: Partial<Activity>, created_by: string): Promise<Activity> {
    const activity = new this.activityModel(activityData);
    activity.created_by = created_by;
    activity.created_at = new Date().getTime().toString();

    // Handle the new activity types
    if (activityData.type === 'True/False' && typeof activityData.isTrue !== 'undefined') {
      activity.isTrue = activityData.isTrue;
    } else if (activityData.type === 'Multiple options' && activityData.options) {
      activity.options = activityData.options;
    } else {
      activity.isTrue = null;
      activity.options = [];
    }
  
    const savedActivity = await activity.save();
    return savedActivity;
  }

  async getAllActivities(): Promise<Activity[]> {
    return this.activityModel.find().exec();
  }

  async getActivityById(id: string): Promise<Activity> {
    return this.activityModel.findById(id).exec();
  }

  async updateActivity(
    id: string,
    updatedActivityData: Partial<Activity>,
  ): Promise<Activity> {
    const activity = await this.activityModel
      .findByIdAndUpdate(id, updatedActivityData, { new: true })
      .exec();
    return activity;
  }

  async deleteActivity(id: string): Promise<Activity> {
    const activity = await this.activityModel.findByIdAndDelete(id).exec();
    return activity;
  }

  async markActivityAsViewed(id: string, created_by: string): Promise<void> {
    const activity = await this.activityModel.findById(id);
    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }
    if (!activity.viewed_by.includes(created_by)) {
      activity.viewed_by.push(created_by);
      await activity.save();
    }
  }

  async getViwedActivitiesByUser(userId: string): Promise<Activity[]> {
    const activities = await this.activityModel.find({ viewed_by: userId }).exec();
    return activities;
  }

  async checkAnswer(answer: string, activityData: Partial<Activity>): Promise<boolean> {
    var result = false;
    
    if (activityData.type !== "Text"){
      // True/False
      if (activityData.type === "True/False"){
        if (answer === activityData.isTrue.toString()){ result = true }
      }

      // Multiple options
      if (activityData.type === "Multiple options" ){
        const correctAnswer = activityData.options.find(option => option.correct === true);
        if (answer === correctAnswer.text){ result = true }
      }
    }
    return result;
  }
}
