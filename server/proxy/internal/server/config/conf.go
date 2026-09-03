package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Host       string `mapstructure:"host"`
		ListenPort string `mapstructure:"listen_port"`
	} `mapstructure:"server"`

	Resources []struct {
		Name           string `mapstructure:"name"`
		Endpoint       string `mapstructure:"endpoint"`
		DestinationURL string `mapstructure:"destination_url"`
	} `mapstructure:"resources"`
}

var configReturn *Config

func GetConfig() (*Config, error) {
	// Viper configuration
	viper.SetConfigName("share")
	viper.SetConfigType("yml")
	viper.AddConfigPath(".")

	// Read share.yml
	if err := viper.ReadInConfig(); err != nil {
		log.Fatal(err)
	}

	if err := viper.Unmarshal(&configReturn); err != nil {
		log.Fatal(err)
	}

	return configReturn, nil
}
