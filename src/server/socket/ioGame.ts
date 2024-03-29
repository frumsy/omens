import RoomManager from '../managers/roomManager'
import IoStats from './ioStats'

/** Handles all the communication for /game namespace (ioNspGame) */
export default class IoGame {
  time = new Date()

  constructor(public ioNspGame: SocketIO.Namespace, public ioStats: IoStats, public roomManager: RoomManager) {
    ioNspGame.on('connection', async (socket: Socket) => {
      roomManager.generateClientId(socket)

      socket.on('joinRoom', async (data: { scene: string; level: number, room: string, nickname: string}) => {
        const { scene, level, room, nickname} = data
        await roomManager.joinRoom(socket, scene, +level, room, nickname)
        ioStats.log(`New user <b>${socket.id}</b> connected! to room ${socket.room}`)
      })

      socket.on('disconnect', () => {
        roomManager.leaveRoom(socket)
      })

      socket.on('changeRoom', (data: { scene: string; level: number }) => {
        roomManager.changeRoom(socket, data.scene, +data.level, "WHY DO I HAVE A CHANGE ROOMS FUNCTION TODO CHANGE LATER")
      })

      socket.on('sendPing', (id: string) => {
        socket.emit('getPong', id)
      })

      socket.on('attemptKill'/* short for attempt to kill */, (data: any)=>{
        if (roomManager.isRemoving(socket.room)) return
        if (!roomManager.userExists(socket.room, socket.id)) return

        roomManager.rooms[socket.room].scene.events.emit('Kill' /* short for updateDude */, {attacker: socket.clientId})
      })

      //update (U) is used for movement
      socket.on('U' /* short for updateDude */, (updates: any) => {
        if (roomManager.isRemoving(socket.room)) return
        if (!roomManager.userExists(socket.room, socket.id)) return

        roomManager.rooms[socket.room].users[socket.id].lastUpdate = Date.now()
        roomManager.rooms[socket.room].scene.events.emit('U' /* short for updateDude */, {
          clientId: socket.clientId,
          updates
        })
      })

      socket.on('getInitialState', () => {
        if (roomManager.isRemoving(socket.room)) return
        if (!roomManager.roomExists(socket.room)) return
        //if (!socket.room) return

        let payload = {
          time: this.time,
          // @ts-ignore
          O /* short for objects */: roomManager.rooms[socket.room].scene.getInitialState(),
          connectCounter: roomManager.getRoomUsersArray(socket.room).length,
          initialState: true,
          roomId: socket.room
        }

        socket.emit('S' /* short for syncGame */, payload)
        // ioNspGame.in(socket.room).emit('S' /* short for syncGame */, payload)
      })
    })
  }
}
