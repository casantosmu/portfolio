package main

import (
	"encoding/json"
	"os"
	"text/template"
)

type project struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Img         string   `json:"img"`
	CodeLink    string   `json:"codeLink"`
	DemoLink    string   `json:"demoLink"`
	Tags        []string `json:"tags"`
}

type data struct {
	Projects []project
}

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func main() {
	projectsJson, err := os.ReadFile("data/projects.json")
	check(err)

	var projects []project
	err = json.Unmarshal(projectsJson, &projects)
	check(err)

	err = os.RemoveAll("build")
	check(err)

	err = os.MkdirAll("build", os.ModePerm)
	check(err)

	f, err := os.Create("build/index.html")
	check(err)
	defer f.Close()

	tmpl, err := template.ParseFiles("html/index.tmpl")
	check(err)

	data := data{
		Projects: projects,
	}

	err = tmpl.Execute(f, data)
	check(err)

	err = os.CopyFS("build", os.DirFS("static"))
	check(err)
}
