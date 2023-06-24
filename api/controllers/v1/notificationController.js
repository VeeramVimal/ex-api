const common = require('../../helpers/common');
const notificationModel = require('../../model/Notification');

const notificationController = {
  async clearAllNotification(req, res) {
    try {
      let { notifyId, userId } = req.body
      for (const notifiedId of notifyId) {
        const result = await notificationModel.findOneAndUpdate(
          { _id: notifiedId }, // Match the document using its _id
          {
            $addToSet: {
              userList: [{ usersId: userId, status: 1 }],
            },
          },
        ).then((data) => {
          res.send({ status: true, message: "cleared successfully" })
        })
      }
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  },
  async getAllNotification(req, res) {
    try {
      const { userId } = req.body;
      const data = await notificationModel.find({ notificationType: "admin" }).where({
        $and: [
          { userList: { $size: 0 } }, // userList is empty
          { userList: { $not: { $elemMatch: { usersId: userId } } } } // userList does not contain the specified user ID
        ]
      }).sort({ _id: -1});
      res.send({ status: true, message: "Unreaded notifications", data })
    } catch (error) {
      res.send({ status: false, message: "Something went wrong" })
    }
  },
  async getAllClearedNotification(req, res) {
    try {
      const { userId } = req.body;
      const data = await notificationModel.find({ notificationType: "admin" }).sort({ _id: -1 })
      res.send({ status: true, message: "Unreaded notifications", data })
    } catch (error) {
      res.send({ status: false, message: "Something went wrong" })
    }
  }
}

module.exports = notificationController;