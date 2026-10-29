package game

import (
	"errors"
	"sync"
	"time"
)

type Manager struct {
	onCompleted func(CompletionEvent)
	rooms       map[string]*GameRoom
	mu          sync.RWMutex
	gracePeriod time.Duration
	timers      map[*GameRoom]map[PlayerID]*time.Timer
}

func NewManager(handlers ...func(CompletionEvent)) *Manager {
	var handler func(CompletionEvent)
	if len(handlers) > 0 {
		handler = handlers[0]
	}
	return &Manager{
		onCompleted: handler,
		rooms:       make(map[string]*GameRoom),
		gracePeriod: 5 * time.Minute,
		timers:      make(map[*GameRoom]map[PlayerID]*time.Timer),
	}
}

func (m *Manager) GetRoom(id string) (*GameRoom, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.rooms[id]
	if !exists {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (m *Manager) CreateRoom(id string) *GameRoom {
	m.mu.Lock()
	defer m.mu.Unlock()

	room := NewGameRoom(id)
	room.onCompleted = m.onCompleted
	m.rooms[id] = room
	return room
}

func (m *Manager) RemoveRoom(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, timer := range m.timers[m.rooms[id]] {
		timer.Stop()
	}
	delete(m.timers, m.rooms[id])
	delete(m.rooms, id)
}

func (m *Manager) joinLocked(roomID string, client Sender) (*GameRoom, error) {
	room := m.rooms[roomID]
	if room == nil {
		room = NewGameRoom(roomID)
		room.onCompleted = m.onCompleted
		m.rooms[roomID] = room
	}
	if err := room.AddPlayer(client); err != nil {
		return nil, err
	}
	if timer := m.timers[room][client.ID()]; timer != nil {
		timer.Stop()
		delete(m.timers[room], client.ID())
	}
	return room, nil
}
func (m *Manager) JoinRoom(roomID string, client Sender) (*GameRoom, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.joinLocked(roomID, client)
}

// Resume uses the authenticated identity when no explicit room was requested.
func (m *Manager) Resume(client Sender) (*GameRoom, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, room := range m.rooms {
		if room.HasPlayer(client.ID()) {
			return m.joinLocked(id, client)
		}
	}
	return nil, errors.New("no active game")
}
func (m *Manager) RemovePlayer(client Sender) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, room := range m.rooms {
		if !room.RemovePlayer(client) {
			continue
		}
		if m.timers[room] == nil {
			m.timers[room] = make(map[PlayerID]*time.Timer)
		}
		playerID := client.ID()
		var timer *time.Timer
		timer = time.AfterFunc(m.gracePeriod, func() {
			m.mu.Lock()
			defer m.mu.Unlock()
			if m.rooms[id] != room || m.timers[room][playerID] != timer {
				return
			}
			room.EndGame()
			for _, pending := range m.timers[room] {
				pending.Stop()
			}
			delete(m.timers, room)
			delete(m.rooms, id)
		})
		m.timers[room][playerID] = timer
	}
}
