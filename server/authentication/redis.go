package main

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	Client *redis.Client
}

func NewRedis(addr string) *Redis {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	return &Redis{
		Client: client,
	}
}

func (r *Redis) Set(
	ctx context.Context,
	key string,
	value string,
	ttl int,
) error {
	return r.Client.Set(
		ctx,
		key,
		value,
		time.Duration(ttl)*time.Second,
	).Err()
}

func (r *Redis) TTL(ctx context.Context, key string) (time.Duration, error) {
	return r.Client.TTL(ctx, key).Result()
}

func (r *Redis) Get(
	ctx context.Context,
	key string,
) (string, error) {
	return r.Client.Get(ctx, key).Result()
}

func (r *Redis) Delete(
	ctx context.Context,
	key string,
) error {
	return r.Client.Del(ctx, key).Err()
}
