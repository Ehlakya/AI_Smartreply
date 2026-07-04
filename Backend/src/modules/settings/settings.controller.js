const Settings = require('./settings.model');
const { sendSuccess, sendError } = require('../../shared/utils/response');

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });
    if (!settings) {
      settings = await Settings.create({ user: req.user._id });
    }
    sendSuccess(res, 'Settings fetched successfully', settings);
  } catch (error) {
    console.error('Get Settings Error:', error);
    sendError(res, 'Failed to fetch settings', 500);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { companyDomain, teamMembers, departmentKeywords, replyTone, signature, language, autoCategorization, autoSync, autoSyncIntervalMinutes } = req.body;
    
    let settings = await Settings.findOne({ user: req.user._id });
    if (!settings) {
      settings = new Settings({ user: req.user._id });
    }

    if (companyDomain !== undefined) settings.companyDomain = companyDomain;
    if (teamMembers !== undefined) settings.teamMembers = teamMembers;
    if (departmentKeywords !== undefined) settings.departmentKeywords = departmentKeywords;
    if (replyTone !== undefined) settings.replyTone = replyTone;
    if (signature !== undefined) settings.signature = signature;
    if (language !== undefined) settings.language = language;
    if (autoCategorization !== undefined) settings.autoCategorization = autoCategorization;
    if (autoSync !== undefined) settings.autoSync = autoSync;
    if (autoSyncIntervalMinutes !== undefined) settings.autoSyncIntervalMinutes = autoSyncIntervalMinutes;

    await settings.save();

    sendSuccess(res, 'Settings updated successfully', settings);
  } catch (error) {
    console.error('Update Settings Error:', error);
    sendError(res, 'Failed to update settings', 500);
  }
};
