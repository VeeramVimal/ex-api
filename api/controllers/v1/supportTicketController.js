
const Ticket = require("../../model/supportTicket");
const issueModel = require("../../model/issue");
let common = require('../../helpers/common');

const supportTickekController = {
    async createTicket (req, res) {
        // console.log("ajsd", req.body)
        // console.log("file", req.files);
        try {
            const data = req.body;
            const file = req.files;
            const ticket_id = Math.floor(10000000 + Math.random() * 90000000);
            const saveData = new Ticket(data);
            saveData.ticketId = ticket_id;
            saveData.images = file[0].filename
            saveData.chatHistory = [{
                userId: data.userId,
                message: data.description,
                userType: "user",
                chattingImage: `${req.protocol}://${req.get('host')}/ticket/${file[0].filename}`
            }]
            saveData.status = 1;
            await saveData.save();
            return res.json({ status: true, message: "Support ticket opened" })
        } catch (err) {
            if(err) throw err;
        }
    },

    async userViewTickets (req, res) {
        try {
            const tickets = await Ticket.find().where({ userId: req.params.id }).populate("userId").populate("subject").exec();
            return res.json({ status: true, data: tickets })
        } catch (err) {
            if(err) throw err;
        }
    },
    
    async replayTicket (req, res) {
        const data = req.body;
        console.log("data", data);
        let datas = {};
        //console.log("ticket===========", data.ticketId);
        try {
            let ticketInfo = Ticket.findById(data.ticketId).exec();
            console.log("ticketInfo===========", ticketInfo);
            if(ticketInfo) {
                let socket = common.GetSocket();
                if(data.attachment != "") {
                    datas = {
                        chattingHistory: {
                            userId: data.userId,
                            message: data.ticketChat,
                            userType: "user",
                            chattingImage: data.attachment
                        }
                    }
                } else {
                    datas = {
                        chattingHistory: {
                            userId: data.userId,
                            message: data.ticketChat,
                            userType: "user",
                            chattingImage: ""
                        }
                    }
                }
                console.log("chat", datas.chattingHistory);
                let result = await Ticket.findByIdAndUpdate(data.ticketId, { $addToSet: { chatHistory:  datas.chattingHistory  } });
                if(result) {
                    socket.sockets.emit("chattingTicketResponse", { chatHistory: datas.chattingHistory, ticketId: data.ticketId });
                    res.json({ "status": true, "message": 'Successfully!' });
                } else {
                    console.log("hi")
                }
            }
            // .then((ticketData) => {
            //     console.log("ticket===========", ticketData);
            //     if(ticketData){
            //         let socket = common.GetSocket();
            //         socket.sockets.emit("")
            // chattingTicketResponse
            //     }
            // });
            const file = req.files;
    
        } catch (err) {
            if(err) throw err;
        }
    },

    async issueList (req, res) {
        try {
            const data = await issueModel.find().exec();
            return res.json({ status: true, data: data })
        } catch (err) {
            if(err) throw err;
        }
    } 
}

module.exports = supportTickekController;