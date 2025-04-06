# sudo apt install python3-pandas python3-sqlalchemy python3-pymysql
import sqlalchemy
import pandas as pd
import json
import sys

class dbConnect:
    def __init__(self, host, database, user, password):
        self.host = host
        self.database = database
        self.user = user
        self.password = password
        
    def executeQuery(self, query):
        constr =  "mysql+pymysql://" + self.user + ":" + self.password + "@" + self.host + "/" + self.database 
        engine = sqlalchemy.create_engine(constr)
        #engine = sqlalchemy.create_engine("mysql+pymysql://root:2424@localhost/amdadb")
        df = pd.read_sql_query(query, engine)
        return df

if __name__ == "__main__":
    args = sys.argv
    host = args[1].strip()
    database = args[2].strip()
    user = args[3].strip()
    password = args[4].strip()
    query = args[5].strip()
    
    conn = dbConnect(host, database, user, password)
    dframe = conn.executeQuery(query)
    
    dataPrint = dframe.value_counts().to_string()
    #dataPrint = dframe.value_counts().to_dict()
  
    print(dataPrint)
    
