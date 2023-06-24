const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const Ticket = require("../../model/supportTicket");
const replyticket = require("../../model/ticketReply");
const issueModel = require("../../model/issue");
const Users = require("../../model/Users");
const tradeHelper = require('../../helpers/trade');
let common = require('../../helpers/common');
const getJSON = require('get-json');
let url = require('url');

const supportTicketAdminController = {
    async viewTicket (req, res) {
        try {
            const tickets = await Ticket.find().populate("userId").populate("subject").exec();
            return res.json({ status: true, data: tickets })
        } catch (err) {
            if(err) throw err;
        }
    },

    async viewTicketOne (req, res) {
        try {
            const tickets = await Ticket.findById(req.params.id).populate("userId").populate("subject").exec();
            return res.json({ status: true, data: tickets })
        } catch (err) {
            if(err) throw err;
        }
    },

    async replayTicket (req, res) {
        const data = req.body;
        let datas = {};
        try {
            let ticketInfo = Ticket.findOne({ticketId:data.ticketId});
            if(ticketInfo) {
                let socket = common.GetSocket();
                if(data.imageData != "") {
                    datas = {
                        chattingHistory: {
                            userId: data.admin_id,
                            message: data.message,
                            userType: "admin",
                            chattingImage: data.imageData
                        }
                    }
                } else {
                    datas = {
                        chattingHistory: {
                            userId: data.admin_id,
                            message: data.message,
                            userType: "admin",
                            chattingImage: ""
                        }
                    }
                }
                // console.log("chat", datas.chattingHistory);
                let result = await Ticket.findByIdAndUpdate(data.ticketId, { $addToSet: { chatHistory:  datas.chattingHistory  } });
                if(result) {
                    socket.sockets.emit("chattingTicketResponse", { chatHistory: datas.chattingHistory, ticketId: data.ticketId });
                    res.json({ "status": true, "message": 'Successfully!' });
                } else {
                    console.log("hi")
                }
            }
            
           const file = req.files;
    
        } catch (err) {
            if(err) throw err;
        }
    },

    async closeTicket (req, res) {
        try {
            console.log(req.params.id)
            await Ticket.findByIdAndUpdate(req.params.id, { status: 0 }, (err, result) => {
                if(err) throw err;
                return res.json({ status: true, data: "ticket closed" })
            }).exec();
        } catch (err) {
            if(err) throw err;
        }
    },

    async createIssue (req, res) {
        try {
            const data = req.body;
            const newIssue = new issueModel(data);
            await newIssue.save()
            return res.json({ status: true, data: "issue title created" })
        } catch (err) {
            if(err) throw err;
        }
    },

    async viewIssue (req, res) {
        try {
            const datas = await issueModel.find().exec();
            return res.json({ status: true, data: datas })
        } catch (err) {
            if(err) throw err;
        }
    },

    async deleteIssue (req, res) {
        try {
            await issueModel.findByIdAndDelete(req.params.id, (err, result) => {
                if(err) throw err;
                return res.json({ status: true, data: "issue deleted" })
            }).exec();
        } catch (err) {
            if(err) throw err;
        }
    }
}

module.exports = supportTicketAdminController;