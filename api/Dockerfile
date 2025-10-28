FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -e -B -DskipTests dependency:go-offline
COPY . .
RUN mvn -q -e -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/mindmap-api-*.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app/app.jar"]
